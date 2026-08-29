import fs from 'fs';
import path from 'path';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import { textSplitter } from '../config/openai.js';
import { Document } from '@langchain/core/documents';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { runOCR, pdfToImages } from './ocrService.js';

const execFilePromise = promisify(execFile);

// Process PDF File with OCR fallback
export async function processPDF(filePath, metadata = {}) {
  try {
    const loader = new PDFLoader(filePath);
    const docs = await loader.load();

    let extractedText = docs.map(d => d.pageContent).join('\n');
    const NEEDS_OCR = extractedText.length < 500;

    if (NEEDS_OCR) {
      console.log('Low text detected → running OCR');
      const images = await pdfToImages(filePath);
      const ocrText = await runOCR(images);

      if (ocrText.length > extractedText.length) {
        docs.push(new Document({
          pageContent: ocrText,
          metadata: { ...metadata, source: 'ocr', type: 'pdf_ocr' }
        }));
      }
    }

    const splitDocs = await textSplitter.splitDocuments(docs);
    splitDocs.forEach(d => {
      d.metadata = { ...d.metadata, ...metadata, type: 'pdf' };
    });

    return splitDocs;

  } catch (error) {
    throw new Error(`PDF processing failed: ${error.message}`);
  }
}


// CSV  File Processing 
export async function processCSV(filePath, metadata = {}) {
  try {
    if (!fs.existsSync(filePath)) throw new Error('CSV file not found');

    const loader = new CSVLoader(filePath);
    const docs = await loader.load();

    if (!docs || docs.length === 0)
      throw new Error('CSV appears to be empty');

    const splitDocs = await textSplitter.splitDocuments(docs);
    splitDocs.forEach(doc => {
      doc.metadata = { ...doc.metadata, ...metadata, type: 'csv' };
    });

    return splitDocs;

  } catch (error) {
    throw new Error(`Failed to process CSV: ${error.message}`);
  }
}

// TXT  File Processing
export async function processTXT(filePath, metadata = {}) {
  try {
    if (!fs.existsSync(filePath)) throw new Error('TXT file not found');

    const content = fs.readFileSync(filePath, 'utf-8');
    if (!content.trim()) throw new Error('TXT file is empty');

    const doc = new Document({
      pageContent: content,
      metadata: { ...metadata, type: 'txt', source: filePath }
    });

    const splitDocs = await textSplitter.splitDocuments([doc]);
    splitDocs.forEach(d => {
      d.metadata = { ...d.metadata, ...metadata, type: 'txt' };
    });

    return splitDocs;

  } catch (error) {
    throw new Error(`Failed to process TXT: ${error.message}`);
  }
}

// YouTube Helpers 
function getYouTubeVideoId(url) {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1].split('&')[0];
    }
  }

  throw new Error('Invalid YouTube URL');
}

function getYtDlpBinary() {
  const localExe = path.join(process.cwd(), 'yt-dlp.exe');
  const localBin = path.join(process.cwd(), 'yt-dlp');
  if (process.platform === 'win32' && fs.existsSync(localExe)) {
    return localExe;
  }
  if (fs.existsSync(localBin)) {
    return localBin;
  }
  return 'yt-dlp';
}

async function getVideoMetadata(videoId) {
  try {
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const ytDlpCmd = getYtDlpBinary();

    // Use execFile instead of exec to prevent command injection
    const { stdout } = await execFilePromise(ytDlpCmd, ['--dump-json', '--no-warnings', videoUrl], {
      timeout: 30000,
      maxBuffer: 5 * 1024 * 1024
    });

    const metadata = JSON.parse(stdout);

    return {
      title: metadata.title || '',
      channel: metadata.uploader || '',
      description: metadata.description || '',
      duration: metadata.duration || 0,
      tags: metadata.tags || []
    };

  } catch {
    return {
      title: '',
      channel: '',
      description: '',
      duration: 0,
      tags: []
    };
  }
}
 //Format seconds into MM:SS or HH:MM:SS
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// Caption-Only Extraction (NO AUDIO DOWNLOAD)
async function tryGetCaptions(videoId) {
  const tempDir = path.join(process.cwd(), 'temp_captions');

  try {
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const outputTemplate = path.join(tempDir, videoId);
    const ytDlpCmd = getYtDlpBinary();

    // Use execFile instead of exec to prevent command injection
    await execFilePromise(ytDlpCmd, [
      '--skip-download',
      '--write-auto-sub',
      '--sub-lang', 'en.*',
      '--sub-format', 'vtt',
      '--convert-subs', 'srt',
      '-o', outputTemplate,
      videoUrl
    ], { timeout: 30000 });

    const files = fs.readdirSync(tempDir);
    const captionFile = files.find(f =>
      f.startsWith(videoId) && (f.endsWith('.srt') || f.endsWith('.vtt'))
    );

    if (!captionFile) return null;

    const fullPath = path.join(tempDir, captionFile);
    const content = fs.readFileSync(fullPath, 'utf-8');

    const cleaned = content
      .split('\n')
      .filter(line =>
        line.trim() &&
        !line.match(/^\d+$/) &&
        !line.includes('-->') &&
        !line.includes('WEBVTT')
      )
      .join(' ')
      .trim();

    fs.unlinkSync(fullPath);

    return cleaned.length > 100 ? cleaned : null;

  } catch (error) {
    console.error(`Caption fetch failed: ${error.message}`);
    return null;
  }
}

// YouTube Processing
async function fetchYouTubeContent(videoId) {
  const metadata = await getVideoMetadata(videoId);
  const captionText = await tryGetCaptions(videoId);

  if (!captionText) {
    throw new Error(
      `This video has no available captions.\n\n` +
      `Please choose a video with [CC] enabled.`
    );
  }

  let content = `Title: ${metadata.title}\n`;
  content += `Channel: ${metadata.channel}\n`;
  if (metadata.duration)
    content += `Duration: ${formatTime(metadata.duration)}\n`;
  content += `URL: https://www.youtube.com/watch?v=${videoId}\n\n`;

  if (metadata.description)
    content += `[Description]\n${metadata.description}\n\n`;

  content += `[Captions]\n${captionText}\n`;

  if (metadata.tags?.length)
    content += `\n[Tags]\n${metadata.tags.slice(0, 10).join(', ')}`;

  return content;
}

async function processYouTubeVideo(url, metadata) {
  const videoId = getYouTubeVideoId(url);
  const content = await fetchYouTubeContent(videoId);

  return [
    new Document({
      pageContent: content,
      metadata: {
        ...metadata,
        source: url,
        videoId,
        type: 'youtube'
      }
    })
  ];
}

// Website content extraction using CheerioWebBaseLoader
async function processWebsite(url, metadata) {
  const loader = new CheerioWebBaseLoader(url, { selector: 'body' });
  const docs = await loader.load();

  if (!docs?.length)
    throw new Error('No content found on webpage');

  docs.forEach(doc => {
    doc.metadata = { ...doc.metadata, ...metadata, source: url, type: 'website' };
  });

  return docs;
}


// URL processing with YouTube and website handling
export async function processURL(url, metadata = {}) {
  try {
    new URL(url);

    const isYouTube = url.includes('youtube.com') || url.includes('youtu.be');
    const docs = isYouTube
      ? await processYouTubeVideo(url, metadata)
      : await processWebsite(url, metadata);

    const splitDocs = await textSplitter.splitDocuments(docs);
    splitDocs.forEach(doc => {
      doc.metadata = { ...doc.metadata, ...metadata };
    });

    return splitDocs;

  } catch (error) {
    throw new Error(error.message || 'Failed to process URL');
  }
}

export default { processPDF, processCSV, processTXT, processURL };