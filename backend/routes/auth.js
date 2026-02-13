
import express from 'express';
import { signup, login, getCurrentUser } from '../controllers/authController.js';
import { signupValidation, loginValidation, checkValidation } from '../utils/validator.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/signup', signupValidation, checkValidation, signup);
router.post('/login', loginValidation, checkValidation, login);

// Protected routes
router.get('/me', authenticateToken, getCurrentUser);

export default router;