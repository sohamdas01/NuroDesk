
import { llm } from "../config/openai.js";
import { createRetriever } from "./vectorService.js";

//  system prompt based on query type

function buildSystemPrompt(docs, history, query) {
  const lowerQuery = query.toLowerCase();
  const docTypes = [...new Set(docs.map(d => d.metadata?.type).filter(Boolean))];
  
  // Build context from docs
  const context = docs
    .map((doc, i) => {
      const text = doc?.pageContent || "";
      const source = doc?.metadata?.source || 
                     doc?.metadata?.filename || 
                     doc?.metadata?.url ||
                     `Document ${i + 1}`;
      const type = doc?.metadata?.type || "unknown";

      return `[${type.toUpperCase()}: ${source}]\n${text}`;
    })
    .join("\n\n---\n\n");

  // Conversation history
  let conversationHistory = "";
  if (history && history.length > 0) {
    conversationHistory = history
      .slice(-6)
      .map((m) => {
        const role = m.role === "user" ? "User" : "Assistant";
        return `${role}: ${m.content || ""}`;
      })
      .join("\n");
  }

  // Determine query type and instructions
  let specificInstructions = '';
  
//   // Website/HTML content queries
//   if (docTypes.includes('url') && (
//       lowerQuery.includes('what is written') ||
//       lowerQuery.includes('code at the top') ||
//       lowerQuery.includes('how to install'))) {
//     specificInstructions = `
//    CRITICAL INSTRUCTION FOR THIS QUERY:

// The documents contain WEB/HTML CONTENT. You MUST extract the actual visible text, ignoring HTML noise.

// HOW TO READ WEB CONTENT:
// 1. IGNORE: CSS classes (text-4xl, text-white, flex, etc.), HTML tags, divs, spans
// 2. EXTRACT: The actual readable text between/after the noise
// 3. Example from content:
//    - Raw: "text-4xl text-white tracking-tighterRapidly build modern websites"
//    - Extract: "Rapidly build modern websites"
//    - Raw: "<div class="flex">Install now</div>"
//    - Extract: "Install now"

// The user is asking about WEB CONTENT. Look carefully through the messy HTML and find the ACTUAL TEXT they're asking about. 
// Even if you see lots of CSS classes and HTML tags, the real text IS THERE - extract it!

// For code/installation queries: Look for commands like "npm install", "yarn add", etc. and quote them EXACTLY.`;
//   }
  
//   // Exact content queries (PDF, TXT, CSV)
//   else if (lowerQuery.includes('exact') || 
//            lowerQuery.includes('word for word') ||
//            lowerQuery.includes('raw content') ||
//            lowerQuery.includes('what are') ||
//            lowerQuery.includes('criteria') ||
//            lowerQuery.includes('list')) {
//     specificInstructions = `
//  CRITICAL INSTRUCTION FOR THIS QUERY:

// The user wants EXACT CONTENT from the document.

// YOU MUST:
// 1. Quote the relevant text EXACTLY as it appears
// 2. Do NOT paraphrase or interpret
// 3. Do NOT add your own explanations
// 4. Copy word-for-word from the documents

// Example:
// Document: "The criteria are: 1. Clearly Defined Objectives 2. Appropriate Research Design"
// User asks: "what are the criteria?"
// CORRECT answer: "The criteria are: 1. Clearly Defined Objectives 2. Appropriate Research Design"
// WRONG answer: "The criteria include having clear objectives and good design" (too interpretive)`;
//   }
  
//   // Full lyrics query (COPYRIGHT PROTECTION)
//   else if (lowerQuery.includes('full lyrics') || 
//            lowerQuery.includes('complete lyrics') ||
//            lowerQuery.includes('entire song')) {
//     specificInstructions = `
//  COPYRIGHT PROTECTION ACTIVE:

// The user is asking for COMPLETE song lyrics. This is copyrighted content.

// YOU MUST:
// 1. Provide SHORT excerpts ONLY (2-3 lines maximum)
// 2. Explain you cannot provide complete copyrighted lyrics
// 3. Describe the song's themes instead
// 4. Cite the source where full lyrics can be found

// DO NOT reproduce the entire song text, even if it's in the documents.`;
//   }
  
//   // Partial lyrics query (OK)
//   else if (lowerQuery.includes('lyrics') || lowerQuery.includes('song')) {
//     specificInstructions = `
// For song lyrics queries:
// - Short excerpts (1-2 lines) are OK
// - If asking for "full/complete" lyrics, refuse and explain copyright
// - Otherwise, provide the excerpts available in the transcription`;
//   }

if (docTypes.includes('url')) {
  
  // For YouTube/Video content with transcriptions
  if (lowerQuery.includes('lyrics') || lowerQuery.includes('song')) {
    specificInstructions = `
 SONG/LYRICS QUERY - SPECIAL HANDLING:

SOURCE PRIORITY:
1. If lyrics are in the VIDEO DESCRIPTION → Provide them fully (they're officially shared)
2. If lyrics are from AUDIO TRANSCRIPTION only → Provide what was transcribed
3. Note transcription quality may vary based on audio clarity

RESPONSE FORMAT:
- For queries asking for lyrics: Provide the lyrics content from the documents
- Include song information (artist, title, source)
- If transcription quality is poor, mention this
- Always cite the source (video description or audio transcription)

IMPORTANT: 
- The content is already in your documents from YouTube
- Provide what's available in the transcription/description
- If asking for "full lyrics" and only partial transcription exists, provide what you have and note it may be incomplete`;
  }
  
  // For code/installation documentation
  else if (lowerQuery.includes('install') || 
           lowerQuery.includes('how to') ||
           lowerQuery.includes('code') ||
           lowerQuery.includes('example') ||
           lowerQuery.includes('command')) {
    specificInstructions = `
 CODE/INSTALLATION QUERY:

WEB CONTENT EXTRACTION RULES:
1. IGNORE: HTML tags, CSS classes (text-4xl, flex, etc.), navigation elements
2. EXTRACT: Installation commands, code examples, step-by-step instructions

COMMON PATTERNS:
- "npm install package-name" → Quote exactly
- "yarn add package-name" → Quote exactly
- Code blocks → Preserve formatting
- Step-by-step instructions → Extract numbered/bulleted steps

HTML NOISE EXAMPLES TO IGNORE:
 <div class="code-block">
 text-sm font-mono bg-gray-900
 className="flex items-center"

EXTRACT THE ACTUAL CONTENT:
 npm install express
 const app = require('express')
 Step 1: Install the package

If you see installation commands buried in HTML, extract them cleanly.`;
  }
  
  // For general website content
  else if (lowerQuery.includes('what is written') ||
           lowerQuery.includes('what is at the top') ||
           lowerQuery.includes('what does the website say') ||
           lowerQuery.includes('content of') ||
           lowerQuery.includes('text on the page')) {
    specificInstructions = `
 WEBSITE CONTENT EXTRACTION:

YOU ARE READING HTML/WEB CONTENT. The text you need is BURIED in HTML noise.

HTML NOISE TO COMPLETELY IGNORE:
 CSS classes: text-4xl, text-white, flex, pt-4, bg-blue-500, etc.
 HTML tags: <div>, <span>, <a>, <img>, <button>, etc.
 Attributes: class="...", id="...", style="...", etc.
 Navigation/UI elements: Quick search, ⌘K, Ctrl K, menu items
 Repeated framework names: React, Vue, Angular (unless relevant)

WHAT TO EXTRACT:
 Headings and titles
 Main descriptive text
 Feature descriptions
 Marketing copy
 Instructions and guides
EXAMPLE:
Raw HTML:
"text-4xl text-5xl text-gray-950 tracking-tighterRapidly build modern websites without ever leaving your HTML."

EXTRACT:
"Rapidly build modern websites without ever leaving your HTML."

ANOTHER EXAMPLE:
Raw: "<div class="flex flex-col items-center">Get startedQuick search⌘K</div>"
EXTRACT: "Get started" (ignore UI elements like "Quick search⌘K")

STRATEGY:
1. Read through the messy HTML
2. Identify readable sentences/phrases
3. Ignore single words that are CSS classes
4. Extract multi-word phrases that form coherent text
5. Present the clean, readable text`;
  }
  
  // For documentation/tutorial websites
  else if (lowerQuery.includes('documentation') ||
           lowerQuery.includes('tutorial') ||
           lowerQuery.includes('guide') ||
           lowerQuery.includes('how does') ||
           lowerQuery.includes('explain')) {
    specificInstructions = `
 DOCUMENTATION/TUTORIAL CONTENT:

EXTRACTION PRIORITY:
1. Main concepts and explanations
2. Step-by-step instructions
3. Code examples (preserve formatting)
4. Important notes/warnings
5. Links to related topics

IGNORE:
- Navigation menus
- Search boxes
- Sidebar elements
- Footer content
- Cookie notices
- Advertisement text

PRESENT:
- Clean, structured explanation
- Code blocks clearly formatted
- Steps in logical order
- Key concepts highlighted`;
  }
  
  // For API/Package documentation
  else if (lowerQuery.includes('api') ||
           lowerQuery.includes('package') ||
           lowerQuery.includes('library') ||
           lowerQuery.includes('module')) {
    specificInstructions = `
 API/PACKAGE DOCUMENTATION:

EXTRACT IN THIS ORDER:
1. Package name and version
2. Installation command
3. Basic usage example
4. Key features/methods
5. Configuration options

PRESERVE:
- Exact function/method names
- Parameter types
- Code examples with correct syntax
- Import/require statements

EXAMPLE FORMAT:
Package: express-jwt
Install: npm install express-jwt
Usage: 
\`\`\`javascript
const jwt = require('express-jwt');
app.use(jwt({ secret: 'secret' }));
\`\`\`

Make code examples readable and properly formatted.`;
  }
  
  // For blog posts/articles
  else if (lowerQuery.includes('article') ||
           lowerQuery.includes('blog') ||
           lowerQuery.includes('post') ||
           lowerQuery.includes('read')) {
    specificInstructions = `
  BLOG/ARTICLE CONTENT:

EXTRACT:
1. Article title/heading
2. Main content paragraphs
3. Subheadings
4. Key points
5. Conclusions

IGNORE:
- Author bio sections
- Related articles sidebar
- Comments section
- Share buttons
- Advertisement blocks

Present the article content in clean, readable format with proper paragraph breaks.`;
  }
  
  // Default for any URL content
  else {
    specificInstructions = `
 GENERAL WEB CONTENT:

You are reading HTML/web content. Extract the ACTUAL READABLE TEXT.

IGNORE ALL:
- CSS classes and styling (text-xl, flex, bg-blue, etc.)
- HTML tags (<div>, <span>, <a>, etc.)
- Navigation elements
- UI framework keywords appearing alone

EXTRACT:
- Sentences and phrases that form coherent text
- Headings and titles
- Descriptions and explanations
- Lists and bullet points (content, not HTML)

Look for MEANING, not markup. The user wants the visible text content, not the HTML structure.`;
  }
}
  return `You are NuroDesk AI, an intelligent document analysis assistant.

${specificInstructions}

${conversationHistory ? `CONVERSATION HISTORY:\n${conversationHistory}\n\n` : ""}

DOCUMENTS:
${context}

USER QUESTION:
${query}

YOUR ANSWER (follow the specific instructions above):`;
}

/**
 * Main RAG query handler
 */
 async function processRAGQuery({ query, history, userId }) {
  try {
    console.log(` Query for user ${userId}: ${query}`);

    const retriever = await createRetriever(15, userId);
    const docs = await retriever.invoke(query);

    console.log(` Retrieved ${docs.length} docs`);

    if (!docs || docs.length === 0) {
      return {
        answer: "I couldn't find any relevant information in your uploaded documents. Please ensure you've uploaded documents related to your question.",
        sources: [],
      };
    }

    // Log  doc for debugging
    if (docs.length > 0) {
      const firstDoc = docs[0];
      console.log(' First doc preview:', {
        hasPageContent: !!firstDoc?.pageContent,
        contentLength: firstDoc?.pageContent?.length || 0,
        type: firstDoc?.metadata?.type,
        source: firstDoc?.metadata?.source?.substring(0, 60),
        contentSnippet: firstDoc?.pageContent?.substring(0, 100),
      });
    }

    // Build prompt 
    const prompt = buildSystemPrompt(docs, history, query);

    // Ask LLM
    console.log(' Sending to OpenAI  prompt...');
    const response = await llm.invoke(prompt);

    const answer =
      typeof response.content === "string"
        ? response.content
        : response.text || "";

    console.log(` Response generated (${answer.length} chars)`);

    // Extract sources
    const sources = docs.slice(0, 5).map((d, i) => {
      const meta = d?.metadata || {};
      return {
        name: meta.filename || meta.source || meta.url || `Document ${i + 1}`,
        type: meta.type || "unknown",
        ...(meta.loc?.pageNumber && { page: meta.loc.pageNumber }),
        ...(meta.videoId && { videoId: meta.videoId }),
      };
    });

    return { answer, sources };
  } catch (error) {
    throw new Error(`RAG query failed: ${error.message}`);
  }
}

export { processRAGQuery };