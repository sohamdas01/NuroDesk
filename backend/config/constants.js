
import dotenv from 'dotenv';
dotenv.config();

export const PORT = process.env.PORT || 3001;
export const NODE_ENV = process.env.NODE_ENV || 'development';

export const FRONTEND_URL = process.env.FRONTEND_URL;
export const QDRANT_URL = process.env.QDRANT_URL;

export const COLLECTION_NAME = 'NeuroDesk_documents';

export const JWT_SECRET = process.env.JWT_SECRET;
export const JWT_EXPIRES_IN = '7d';

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is not defined in environment variables');
}

export const MAX_FILE_SIZE = 50 * 1024 * 1024;
export const UPLOAD_DIR = './uploads';

export const ALLOWED_FILE_TYPES = {
  PDF: '.pdf',
  CSV: '.csv',
};
