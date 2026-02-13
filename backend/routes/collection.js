
import express from 'express';
import { getCollectionInfo, resetCollection } from '../controllers/collectionController.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.get('/info', authenticateToken, getCollectionInfo);
router.delete('/reset', authenticateToken, resetCollection);

export default router;