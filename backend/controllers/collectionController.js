
import qdrantClient from '../config/qdrant.js';
import { COLLECTION_NAME } from '../config/constants.js';
import { initializeQdrant } from '../config/qdrant.js';


  // Get collection information
 
export async function getCollectionInfo(req, res, next) {
  try {
    const collectionInfo = await qdrantClient.getCollection(COLLECTION_NAME);

    res.json({
      success: true,
      collection: collectionInfo,
    });
  } catch (error) {
    next(error);
  }
}

// Reset/delete collection 
export async function resetCollection(req, res, next) {
  try {
    // Delete collection
    await qdrantClient.deleteCollection(COLLECTION_NAME);

    // Recreate collection
    await initializeQdrant();

    res.json({
      success: true,
      message: 'Collection reset successfully',
    });
  } catch (error) {
    next(error);
  }
}

export default {
  getCollectionInfo,
  resetCollection,
};