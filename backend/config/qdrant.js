
import { QdrantClient } from '@qdrant/js-client-rest';

const QDRANT_URL = process.env.QDRANT_URL ;
const QDRANT_API_KEY = process.env.QDRANT_API_KEY; 
const COLLECTION_NAME = 'NeuroDesk_documents';

// Initialize Qdrant client
export const qdrantClient = new QdrantClient({
  url: QDRANT_URL,
  ...(QDRANT_API_KEY && { apiKey: QDRANT_API_KEY }), 
});

//  Initialize Qdrant collection
export async function initializeQdrant() {
  try {
    // Check if collection exists
    const collections = await qdrantClient.getCollections();
    const exists = collections.collections.some(
      col => col.name === COLLECTION_NAME
    );

    if (!exists) {
      await qdrantClient.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 3072, // text-embedding-3-large dimension
          distance: 'Cosine',
        },
      });
      console.log(` Collection ${COLLECTION_NAME} created`);
    } else {
      console.log(` Collection ${COLLECTION_NAME} already exists`);
    }

    // Verify connection by getting collection info
    const collectionInfo = await qdrantClient.getCollection(COLLECTION_NAME);
    console.log(` Collection info:`, {
      vectors_count: collectionInfo.vectors_count || 0,
      points_count: collectionInfo.points_count || 0,
    });

    console.log(' Qdrant initialized successfully');
  } catch (error) {
    throw error;
  }
}

export { COLLECTION_NAME };
export default qdrantClient;