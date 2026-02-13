
import { embeddings } from '../config/openai.js';
import qdrantClient, { COLLECTION_NAME } from '../config/qdrant.js';
import { v4 as uuidv4 } from 'uuid';

//  Store documents DIRECTLY in Qdrant
 
export async function storeDocuments(documents, userId) {
  try {
    if (!documents || documents.length === 0) {
      throw new Error('No documents provided');
    }

    console.log(` Storing ${documents.length} chunks in Qdrant for user ${userId}...`);

    const points = [];

    for (const doc of documents) {
      const embedding = await embeddings.embedQuery(doc.pageContent);

      const point = {
        id: uuidv4(),
        vector: embedding,
        payload: {
          userId: userId,
          text: doc.pageContent,
          type: doc.metadata?.type || doc.type || 'unknown',
          source: doc.metadata?.source || doc.metadata?.filename || doc.metadata?.url || 'unknown',
          uploadedAt: doc.metadata?.uploadedAt || new Date().toISOString(),
          
          ...(doc.metadata?.filename && { filename: doc.metadata.filename }),
          ...(doc.metadata?.url && { url: doc.metadata.url }),
          ...(doc.metadata?.videoId && { videoId: doc.metadata.videoId }),
          ...(doc.metadata?.loc && { loc: doc.metadata.loc }),
        },
      };

      points.push(point);
    }

    console.log('Sample payload:', JSON.stringify(points[0].payload, null, 2));

    await qdrantClient.upsert(COLLECTION_NAME, {
      wait: true,
      points: points,
    });

    console.log(`Stored ${documents.length} document chunks for user ${userId}`);
  } catch (error) {
    throw new Error(`Failed to store documents: ${error.message}`);
  }
}

//  Create retriever using DIRECT Qdrant queries BYPASSES LangChain wrapper completely 
 
export async function createRetriever(k = 15, userId) {
  try {
    console.log(`🔍 Creating retriever for user: ${userId}`);

    const retriever = {
      invoke: async (query) => {
        //  Generate embedding for the query
        const queryEmbedding = await embeddings.embedQuery(query);

        //  Search Qdrant DIRECTLY with proper payload retrieval
        
        const searchResult = await qdrantClient.search(COLLECTION_NAME, {
          vector: queryEmbedding,
          filter: {
            must: [
              {
                key: 'userId',
                match: { value: userId },
              },
            ],
          },
          limit: k,
          with_payload: true,  // Get the payload
          with_vector: false,
        });

        console.log(` Found ${searchResult.length} results`);

        //  Transform to LangChain format
        const docs = searchResult.map((result) => {
          const payload = result.payload;

          return {
            pageContent: payload.text || "",
            metadata: {
              type: payload.type,
              source: payload.source,
              filename: payload.filename,
              url: payload.url,
              videoId: payload.videoId,
              loc: payload.loc,
              uploadedAt: payload.uploadedAt,
              userId: payload.userId,
              score: result.score,  // Similarity score
            },
          };
        });

        console.log(`Transformed ${docs.length} documents`);
        if (docs.length > 0) {
          console.log(` First doc preview:`, {
            hasContent: !!docs[0].pageContent,
            contentLength: docs[0].pageContent.length,
            type: docs[0].metadata.type,
            source: docs[0].metadata.source?.substring(0, 50),
          });
        }

        return docs;
      },
    };

    console.log(` Retriever created for user ${userId}`);
    return retriever;
  } catch (error) {
    throw new Error(`Failed to create retriever: ${error.message}`);
  }
}

//  Delete all documents for a specific user
 
export async function deleteUserDocuments(userId) {
  try {

    const scrollResult = await qdrantClient.scroll(COLLECTION_NAME, {
      filter: {
        must: [
          {
            key: 'userId',
            match: { value: userId },
          },
        ],
      },
      limit: 10000,
      with_payload: false,
      with_vector: false,
    });

    const pointIds = scrollResult.points.map(point => point.id);

    if (pointIds.length > 0) {
      await qdrantClient.delete(COLLECTION_NAME, {
        points: pointIds,
      });
      console.log(` Deleted ${pointIds.length} documents for user ${userId}`);
      return pointIds.length;
    } else {
      console.log(` No documents found for user ${userId}`);
      return 0;
    }
  } catch (error) {
    throw new Error(`Failed to delete documents: ${error.message}`);
  }
}

export default { storeDocuments, createRetriever, deleteUserDocuments };