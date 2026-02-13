
import express from 'express';
import { uploadPDF, uploadCSV, uploadURLHandler,uploadTXT } from '../controllers/uploadController.js';
import { authenticateToken } from '../middleware/auth.js';
import { upload } from '../middleware/upload.js';
import { urlValidation, checkValidation } from '../utils/validator.js';

const router = express.Router();

router.post('/pdf', authenticateToken, upload.single('file'), uploadPDF);
router.post('/csv', authenticateToken, upload.single('file'), uploadCSV);
router.post('/txt', authenticateToken, upload.single('file'), uploadTXT);
router.post('/url', authenticateToken, urlValidation, checkValidation, uploadURLHandler);

export default router;