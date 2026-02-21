
import fs from 'fs';
import path from 'path';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { textSplitter } from '../config/openai.js';
import { Document } from '@langchain/core/documents';
import { exec } from 'child_process';
import { promisify } from 'util';
import OpenAI from 'openai';
import { runOCR, pdfToImages } from './ocrService.js';

const execPromise = promisify(exec);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Write cookies from env variable to temp file
function getCookiesFile() {
  const cookiesContent = process.env.YOUTUBE_COOKIES;
  if (!cookiesContent) return null;

  const cookiePath = path.join(process.cwd(), 'temp_cookies.txt');
  fs.writeFileSync(cookiePath, cookiesContent);
  return cookiePath;
}



// Process PDF file

export async function processPDF(filePath, metadata = {}) {
  try {
    const loader = new PDFLoader(filePath);
    const docs = await loader.load();

    let extractedText = docs.map(d => d.pageContent).join('\n');

    //  OCR TRIGGER RULE
    const NEEDS_OCR = extractedText.length < 500;

    if (NEEDS_OCR) {
      console.log(' Low text detected → running OCR');

      const images = await pdfToImages(filePath);
      const ocrText = await runOCR(images);

      if (ocrText.length > extractedText.length) {
        docs.push(
          new Document({
            pageContent: ocrText,
            metadata: {
              ...metadata,
              source: 'ocr',
              type: 'pdf_ocr',
            },
          })
        );
      }
    }

    const splitDocs = await textSplitter.splitDocuments(docs);

    splitDocs.forEach(d => {
      d.metadata = { ...d.metadata, ...metadata };
    });

    return splitDocs;
  } catch (error) {
    throw new Error(`PDF processing failed: ${error.message}`);
  }
}

// Process CSV file

export async function processCSV(filePath, metadata = {}) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error('CSV file not found');
    }

    console.log(`Loading CSV: ${filePath}`);
    const loader = new CSVLoader(filePath);
    const docs = await loader.load();

    if (!docs || docs.length === 0) {
      throw new Error('CSV appears to be empty or has invalid format');
    }

    console.log(` Loaded ${docs.length} rows from CSV`);

    const splitDocs = await textSplitter.splitDocuments(docs);
    console.log(` Split into ${splitDocs.length} chunks`);

    splitDocs.forEach(doc => {
      doc.metadata = { ...doc.metadata, ...metadata, type: 'csv' };
    });

    return splitDocs;
  } catch (error) {
    throw new Error(`Failed to process CSV: ${error.message}`);
  }
}

// Process TXT file

export async function processTXT(filePath, metadata = {}) {
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error('TXT file not found');
    }

    // Read file content
    const content = fs.readFileSync(filePath, 'utf-8');

    if (!content || content.trim().length === 0) {
      throw new Error('TXT file is empty');
    }

    console.log(`Loaded ${content.length} characters from TXT`);

    // Create a document from the content
    const doc = new Document({
      pageContent: content,
      metadata: {
        ...metadata,
        type: 'txt',
        source: filePath,
      }
    });

    // Split into chunks
    const splitDocs = await textSplitter.splitDocuments([doc]);
    console.log(` Split into ${splitDocs.length} chunks`);

    splitDocs.forEach(doc => {
      doc.metadata = { ...doc.metadata, ...metadata, type: 'txt' };
    });

    return splitDocs;
  } catch (error) {
    throw new Error(`Failed to process TXT: ${error.message}`);
  }
}


// Extract YouTube video ID

function getYouTubeVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1].split('&')[0].split('?')[0];
    }
  }

  throw new Error('Invalid YouTube URL format');
}


// Get comprehensive video metadata including description using yt-dlp

async function getVideoMetadata(videoId) {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Use yt-dlp to get full metadata including description
    const command = `yt-dlp --dump-json --no-warnings "${videoUrl}"`;

    const { stdout } = await execPromise(command, {
      timeout: 30000,
      maxBuffer: 5 * 1024 * 1024
    });

    const metadata = JSON.parse(stdout);

    return {
      title: metadata.title || '',
      channel: metadata.uploader || metadata.channel || '',
      description: metadata.description || '',
      duration: metadata.duration || 0,
      upload_date: metadata.upload_date || '',
      chapters: metadata.chapters || [],
      tags: metadata.tags || [],
    };

  } catch (err) {
    console.log(`Could not fetch full metadata, using fallback`);

    // Fallback to oEmbed
    try {
      const oEmbedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      const response = await fetch(oEmbedUrl);

      if (response.ok) {
        const data = await response.json();
        return {
          title: data.title || '',
          channel: data.author_name || '',
          description: '',
          duration: 0,
          upload_date: '',
          chapters: [],
          tags: [],
        };
      }
    } catch (fallbackErr) {
      console.log(` Fallback also failed`);
    }
  }

  return {
    title: '',
    channel: '',
    description: '',
    duration: 0,
    upload_date: '',
    chapters: [],
    tags: [],
  };
}


//  Extract and fetch code from GitHub links in video description

async function fetchGitHubCode(description) {
  if (!description) return null;

  try {
    // Find GitHub repo links in description
    const githubPatterns = [
      /https?:\/\/github\.com\/([a-zA-Z0-9-_]+\/[a-zA-Z0-9-_\.]+)/g,
      /github\.com\/([a-zA-Z0-9-_]+\/[a-zA-Z0-9-_\.]+)/g,
    ];

    let repoUrl = null;
    for (const pattern of githubPatterns) {
      const matches = description.match(pattern);
      if (matches && matches.length > 0) {
        repoUrl = matches[0];
        if (!repoUrl.startsWith('http')) {
          repoUrl = 'https://' + repoUrl;
        }
        break;
      }
    }

    if (!repoUrl) {
      console.log(' No GitHub links found in description');
      return null;
    }

    console.log(` Found GitHub repo: ${repoUrl}`);

    // Try to fetch README from both main and master branches
    // const branches = ['main', 'master'];

    // for (const branch of branches) {
    //   try {
    //     const readmeUrl = repoUrl
    //       .replace('github.com', 'raw.githubusercontent.com')
    //       .replace(/\/$/, '') + `/${branch}/README.md`;

    //     console.log(` Trying to fetch: ${readmeUrl}`);

    //     const response = await fetch(readmeUrl, {
    //       headers: {
    //         'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    //       },
    //     });

    //     if (response.ok) {
    //       const readme = await response.text();

    //       if (readme.length > 100) {
    //         console.log(` Fetched README from GitHub (${readme.length} chars, ${branch} branch)`);
    //         return `\n\n[GitHub Repository Code/Documentation]\nRepository: ${repoUrl}\nBranch: ${branch}\n\n${readme}\n`;
    //       }
    //     }
    //   } catch (fetchError) {
    //     console.log(` Failed to fetch from ${branch} branch: ${fetchError.message}`);
    //     continue;
    //   }
    // }

    // If README fetch failed, at least return the link
    // console.log(` Could not fetch README content, but found repo link`);
    return `\n\n[GitHub Repository]\nCode repository: ${repoUrl}\n(Visit the link to see the full code)\n`;

  } catch (error) {
    console.log(` GitHub code fetch error: ${error.message}`);
  }

  return null;
}


//  Try to get YouTube captions 

async function tryGetCaptions(videoId) {
  try {
    const { YoutubeTranscript } = await import('youtube-transcript');

    const languages = ['en', 'hi', 'es', 'fr', 'de', 'ja', 'ko', 'pt', 'ru', 'ar'];

    for (const lang of languages) {
      try {
        const transcript = await YoutubeTranscript.fetchTranscript(videoId, { lang });

        if (transcript && Array.isArray(transcript) && transcript.length > 0) {
          const text = transcript
            .map(item => item?.text || '')
            .filter(Boolean)
            .join(' ')
            .trim();

          if (text.length > 100) {
            console.log(` Found ${lang.toUpperCase()} captions: ${text.length} characters`);
            return text;
          }
        }
      } catch (err) {
        continue;
      }
    }

    console.log(` No captions found in any language`);
    return null;

  } catch (error) {
    console.error(` Caption error:`, error.message);
    return null;
  }
}


// Download YouTube audio using yt-dlp 

// async function downloadYouTubeAudio(videoId) {
//   let outputPath = null;

//   try {
//     const outputDir = path.join(process.cwd(), 'temp_audio');
//     if (!fs.existsSync(outputDir)) {
//       fs.mkdirSync(outputDir, { recursive: true });
//     }

//     outputPath = path.join(outputDir, `${videoId}.mp3`);

//     try {
//       const { stdout } = await execPromise('yt-dlp --version');
//       console.log(` yt-dlp version: ${stdout.trim()}`);
//     } catch (error) {
//       throw new Error(
//         `yt-dlp is not installed or not found in PATH.`
//       );
//     }

//     const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

//     // const command = [
//     //   'yt-dlp',
//     //   '--no-warnings',
//     //   '--no-check-certificates',
//     //   '--prefer-free-formats',
//     //   '--extractor-args', 'youtube:player_client=android,music',
//     //   '--user-agent', '"Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36"',
//     //   '-f', 'bestaudio/best',
//     //   '-x',
//     //   '--audio-format', 'mp3',
//     //   '--audio-quality', '5',
//     //   '--no-playlist',
//     //   '--max-filesize', '26M',
//     //   '-o', `"${outputPath}"`,
//     //   `"${videoUrl}"`
//     // ].join(' ');

// //     const cookiesFile = getCookiesFile();

// // const command = [
// //   'yt-dlp',
// //   '--no-warnings',
// //   '--no-check-certificates',
// //   '--extractor-args', 'youtube:player_client=android,music',
// //   ...(cookiesFile ? ['--cookies', `"${cookiesFile}"`] : []),
// //   '-f', 'bestaudio/best',
// //    '-x',
// //       '--audio-format', 'mp3',
// //       '--audio-quality', '5',
// //       '--no-playlist',
// //       '--max-filesize', '26M',
// //       '-o', `"${outputPath}"`,
// //       `"${videoUrl}"`
// //     ].join(' ');

// const cookiesFile = "/opt/render/project/src/backend/cookies.txt";

// const command = [
//   "yt-dlp",
//   "--no-warnings",
//   "--no-check-certificates",
//   "--extractor-args", "youtube:player_client=android,music",
//   "--cookies", cookiesFile,
//   "-f", "bestaudio/best",
//   "-x",
//   "--audio-format", "mp3",
//   "--audio-quality", "5",
//   "--no-playlist",
//   "--max-filesize", "26M",
//   "-o", `"${outputPath}"`,
//   `"${videoUrl}"`
// ].join(" ");
//     try {
//       await execPromise(command, {
//         timeout: 300000,
//         maxBuffer: 10 * 1024 * 1024
//       });
//     } catch (dlError) {
//       console.log(` Android client failed, trying iOS client...`);

//       // const iosCommand = [
//       //   'yt-dlp',
//       //   '--no-warnings',
//       //   '--no-check-certificates',
//       //   '--extractor-args', 'youtube:player_client=android_embedded',
//       //  '--user-agent', '"Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36"',
//       //   '-f', 'bestaudio/best',
//       //   '-x',
//       //   '--audio-format', 'mp3',
//       //   '--audio-quality', '5',
//       //   '--no-playlist',
//       //   '--max-filesize', '26M',
//       //   '-o', `"${outputPath}"`,
//       //   `"${videoUrl}"`
//       // ].join(' ');

//       const iosCommand = [
//   'yt-dlp',
//   '--no-warnings',
//   '--no-check-certificates',
//   '--extractor-args', 'youtube:player_client=android,music',
//   ...(cookiesFile ? ['--cookies', `"${cookiesFile}"`] : []),
//   '-f', 'bestaudio/best',
//    '-x',
//         '--audio-format', 'mp3',
//         '--audio-quality', '5',
//         '--no-playlist',
//         '--max-filesize', '26M',
//         '-o', `"${outputPath}"`,
//         `"${videoUrl}"`
//       ].join(' ');

//       await execPromise(iosCommand, {
//         timeout: 300000,
//         maxBuffer: 10 * 1024 * 1024
//       });
//     }

//     if (!fs.existsSync(outputPath)) {
//       throw new Error('Audio download failed - file not created');
//     }

//     const stats = fs.statSync(outputPath);
//     const sizeMB = stats.size / 1024 / 1024;

//     console.log(` Audio downloaded: ${sizeMB.toFixed(2)} MB`);

//     if (sizeMB > 25) {
//       throw new Error(
//         `Audio file too large (${sizeMB.toFixed(1)}MB).\n` +
//         `This video is very long. Try:\n` +
//         `1. A shorter video (< 1 hour)\n` +
//         `2. Or use a video with captions`
//       );
//     }

//     return outputPath;

//   } catch (error) {
//     if (outputPath && fs.existsSync(outputPath)) {
//       try {
//         fs.unlinkSync(outputPath);
//       } catch (cleanupError) {
//         console.error(`Could not delete temp file:`, cleanupError.message);
//       }
//     }

//     if (error.message.includes('403') || error.message.includes('Forbidden')) {
//       throw new Error(
//         `This video might be:\n` +
//         `• Region-restricted\n` +
//         `• Age-restricted\n` +
//         `• Premium/Members-only content\n\n` +
//         `Try:\n` +
//         ` Try a different public video\n`
//       );
//     }

//     throw error;
//   }
// }
async function downloadYouTubeAudio(videoId) {
  let outputPath = null;

  try {
    const outputDir = path.join(process.cwd(), 'temp_audio');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    outputPath = path.join(outputDir, `${videoId}.mp3`);
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    // Check yt-dlp installation
    try {
      const { stdout } = await execPromise('yt-dlp --version');
      console.log(`yt-dlp version: ${stdout.trim()}`);
    } catch {
      throw new Error('yt-dlp is not installed or not found in PATH.');
    }

    // Get cookies file if available
    const cookiesFile = getCookiesFile();

    // Step 1: List formats
    let { stdout: formatsOut } = await execPromise(
      `yt-dlp --list-formats ${cookiesFile ? `--cookies "${cookiesFile}"` : ''} "${videoUrl}"`,
      { timeout: 30000, maxBuffer: 5 * 1024 * 1024 }
    );

    console.log(`Available formats:\n${formatsOut}`);

    // Step 2: Pick best audio format
    let chosenFormat = 'bestaudio/best';
    if (!formatsOut.includes('audio only')) {
      // fallback to common audio IDs
      if (formatsOut.includes('140')) {
        chosenFormat = '140'; // m4a
      } else if (formatsOut.includes('251')) {
        chosenFormat = '251'; // webm/opus
      }
    }

    console.log(`Chosen format: ${chosenFormat}`);

    // Step 3: Build command
    const command = [
      'yt-dlp',
      '--no-warnings',
      '--no-check-certificates',
      '--extractor-args', 'youtube:player_client=android,music',
      ...(cookiesFile ? ['--cookies', `"${cookiesFile}"`] : []),
      '-f', chosenFormat,
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '5',
      '--no-playlist',
      '--max-filesize', '26M',
      '-o', `"${outputPath}"`,
      `"${videoUrl}"`
    ].join(' ');

    // Step 4: Run download
    await execPromise(command, { timeout: 300000, maxBuffer: 10 * 1024 * 1024 });

    if (!fs.existsSync(outputPath)) {
      throw new Error('Audio download failed - file not created');
    }

    const stats = fs.statSync(outputPath);
    const sizeMB = stats.size / 1024 / 1024;
    console.log(`Audio downloaded: ${sizeMB.toFixed(2)} MB`);

    if (sizeMB > 25) {
      throw new Error(
        `Audio file too large (${sizeMB.toFixed(1)}MB).\n` +
        `This video is very long. Try:\n` +
        `1. A shorter video (< 1 hour)\n` +
        `2. Or use a video with captions`
      );
    }

    return outputPath;

  } catch (error) {
    if (outputPath && fs.existsSync(outputPath)) {
      try { fs.unlinkSync(outputPath); } catch {}
    }

    if (error.message.includes('Sign in to confirm')) {
      throw new Error('YouTube requires login. Refresh cookies and try again.');
    }

    if (error.message.includes('403') || error.message.includes('Forbidden')) {
      throw new Error(
        `This video might be:\n` +
        `• Region-restricted\n` +
        `• Age-restricted\n` +
        `• Premium/Members-only content\n\n` +
        `Try a different public video`
      );
    }

    throw error;
  }
}
// Transcribe audio using OpenAI Whisper API

async function transcribeWithWhisper(audioFilePath) {
  try {

    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured in .env');
    }

    const stats = fs.statSync(audioFilePath);
    const sizeMB = stats.size / 1024 / 1024;

    console.log(` Uploading to OpenAI Whisper (${sizeMB.toFixed(2)} MB)...`);

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(audioFilePath),
      model: 'whisper-1',
      language: 'en',
      response_format: 'text',
    });

    if (!transcription || typeof transcription !== 'string' || transcription.length < 50) {
      throw new Error('Transcription returned insufficient content');
    }

    const cost = sizeMB * 0.006;

    console.log(` Transcription complete: ${transcription.length} characters`);
    console.log(` Cost: ~$${cost.toFixed(3)}`);

    return transcription;

  } catch (error) {
    console.error(`OpenAI Whisper error:`, error.message);
    throw error;
  }
}

//  Format chapters into readable text

function formatChapters(chapters) {
  if (!chapters || chapters.length === 0) return '';

  const formattedChapters = chapters.map(chapter => {
    const time = formatTime(chapter.start_time || 0);
    const title = chapter.title || 'Untitled';
    return `${time} - ${title}`;
  }).join('\n');

  return `\n\n[Video Chapters/Timestamps]\n${formattedChapters}\n`;
}


//  Format seconds into MM:SS or HH:MM:SS

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}


// Extract YouTube content with comprehensive metadata, captions, and GitHub code if available
async function fetchYouTubeContent(videoId) {
  const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
  let audioFilePath = null;

  try {
    // Get comprehensive metadata (including description)
    const metadata = await getVideoMetadata(videoId);
    console.log(` Video: ${metadata.title || videoId}`);
    console.log(` Channel: ${metadata.channel || 'Unknown'}`);
    if (metadata.duration) {
      console.log(` Duration: ${formatTime(metadata.duration)}`);
    }
    //  Try to fetch GitHub code from description
    let githubCode = null;
    if (metadata.description) {
      githubCode = await fetchGitHubCode(metadata.description);
    }

    let captionText = null;
    let transcriptText = null;

    //  Try captions 
    captionText = await tryGetCaptions(videoId);

    if (captionText && captionText.length > 200) {
      console.log(`\n SUCCESS: Using captions (FREE)\n`);
    } else {
      //  No captions - download and transcribe
      console.log(`No captions - downloading and transcribing...\n`);

      try {
        audioFilePath = await downloadYouTubeAudio(videoId);
        transcriptText = await transcribeWithWhisper(audioFilePath);
        console.log(` SUCCESS: Transcribed with OpenAI Whisper\n`);
      } catch (transcriptError) {
        console.error(`Transcription failed:`, transcriptError.message);
        throw transcriptError;
      }
    }

    // STEP 5: Build comprehensive content with all metadata
    let fullContent = '';

    // Title and metadata
    if (metadata.title) {
      fullContent += `Title: ${metadata.title}\n`;
    }
    if (metadata.channel) {
      fullContent += `Channel: ${metadata.channel}\n`;
    }
    if (metadata.duration) {
      fullContent += `Duration: ${formatTime(metadata.duration)}\n`;
    }
    fullContent += `URL: ${videoUrl}\n`;

    // Description ( contains timestamps)
    if (metadata.description && metadata.description.length > 50) {
      fullContent += `\n[Video Description]\n${metadata.description}\n`;
    }

    // GitHub code (if found in description)
    if (githubCode) {
      fullContent += githubCode;
    }

    // Chapters/Timestamps
    if (metadata.chapters && metadata.chapters.length > 0) {
      fullContent += formatChapters(metadata.chapters);
    }

    // Audio content (captions or transcription)
    if (captionText) {
      fullContent += `\n\n[Captions/Subtitles - Spoken Audio]\n${captionText}\n`;
    } else if (transcriptText) {
      fullContent += `\n\n[AI Transcription - Spoken Audio Only]\n`;
      fullContent += `Note: This transcription is from audio only. Visual content (code on screen, slides, diagrams) is not included.\n`;
      if (githubCode) {
        fullContent += `However, code from the GitHub repository linked in the description has been included above.\n`;
      } else {
        fullContent += `If code examples were shown on screen, they may not appear in this transcription. Check the video description for code repository links.\n`;
      }
      fullContent += `\n${transcriptText}\n`;
    }

    // Tags 
    if (metadata.tags && metadata.tags.length > 0) {
      fullContent += `\n\n[Tags]\n${metadata.tags.slice(0, 10).join(', ')}\n`;
    }

    if (fullContent.length < 200) {
      throw new Error(
        `Unable to extract meaningful content from this video.\n\n` +
        `Video: ${metadata.title || videoUrl}\n\n` +
        `This video may be:\n` +
        `• Too short or music-only (no speech)\n` +
        `• Private, age-restricted, or region-locked\n` +
        `Try a different public video with spoken content.`
      );
    }

    return fullContent;

  } finally {
    //  cleanup temp audio file
    if (audioFilePath && fs.existsSync(audioFilePath)) {
      try {
        fs.unlinkSync(audioFilePath);
        console.log(` Cleaned up temp audio file`);
      } catch (cleanupError) {
        console.error(` Could not delete temp file:`, cleanupError.message);
      }
    }
  }
}

//  Process YouTube video URL and extract comprehensive content

async function processYouTubeVideo(url, metadata) {
  const videoId = getYouTubeVideoId(url);

  try {
    const content = await fetchYouTubeContent(videoId);

    const doc = new Document({
      pageContent: content,
      metadata: {
        ...metadata,
        source: url,
        videoId,
        type: 'youtube',
        contentLength: content.length,
      },
    });

    return [doc];
  } catch (error) {
    console.error(' YouTube processing failed:', error.message, '\n');
    throw error;
  }
}

//  Process website URL and extract content using CheerioWebBaseLoader

async function processWebsite(url, metadata) {
  try {
    const loader = new CheerioWebBaseLoader(url, { selector: 'body' });
    const docs = await loader.load();

    if (!docs || docs.length === 0) {
      throw new Error('No content found on webpage');
    }

    const content = docs[0].pageContent.trim();
    if (content.length < 100) {
      throw new Error('Insufficient content on webpage');
    }

    docs.forEach(doc => {
      doc.metadata = { ...doc.metadata, ...metadata, source: url, type: 'website' };
    });

    return docs;
  } catch (error) {
    console.error(' Website error:', error);
    throw new Error(`Failed to load webpage: ${error.message}`);
  }
}

//  Process URL (YouTube or website)

export async function processURL(url, metadata = {}) {
  try {

    new URL(url);

    let docs;

    if (url.includes('youtube.com') || url.includes('youtu.be')) {
      docs = await processYouTubeVideo(url, metadata);
    } else {
      docs = await processWebsite(url, metadata);
    }

    if (!docs || docs.length === 0) {
      throw new Error('No content extracted from URL');
    }

    const splitDocs = await textSplitter.splitDocuments(docs);
    console.log(`Created ${splitDocs.length} document chunks`);

    splitDocs.forEach(doc => {
      doc.metadata = { ...doc.metadata, ...metadata };
    });

    return splitDocs;
  } catch (error) {
    console.error('URL processing error:', error);
    throw new Error(error.message || 'Failed to process URL');
  }
}

export default { processPDF, processCSV, processURL, processTXT };