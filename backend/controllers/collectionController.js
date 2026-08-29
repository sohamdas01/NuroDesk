
import qdrantClient from '../config/qdrant.js';
import { COLLECTION_NAME } from '../config/constants.js';
import { deleteUserDocuments } from '../services/vectorService.js';


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

// Reset user's documents 
export async function resetCollection(req, res, next) {
  try {
    const deletedCount = await deleteUserDocuments(req.user.id);

    res.json({
      success: true,
      message: `Deleted ${deletedCount} documents for your account`,
      deletedCount,
    });
  } catch (error) {
    next(error);
  }
}

export default {
  getCollectionInfo,
  resetCollection,
};