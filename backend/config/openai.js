
import { ChatOpenAI } from '@langchain/openai';
import { OpenAIEmbeddings } from '@langchain/openai';
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY is required');
}

const cleanApiKey = OPENAI_API_KEY.trim();


//  text-embedding-3-large (embeddings)
export const embeddings = new OpenAIEmbeddings({
  openAIApiKey: cleanApiKey,
  modelName: 'text-embedding-3-large',
});


export const llm = new ChatOpenAI({
  openAIApiKey: cleanApiKey,
  modelName: 'gpt-4o', 
  temperature: 0.1, // Lower temperature for more focused responses
});

//  CHUNKING 
export const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 4000,      
  chunkOverlap: 800,    
  separators: ['\n\n', '\n', '. ', ' ', ''], // Natural break points
});



export default { embeddings, llm, textSplitter };