
import express from 'express';
import { signup, login, getCurrentUser } from '../controllers/authController.js';
import { signupValidation, loginValidation, checkValidation } from '../utils/validator.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
router.post('/signup', signupValidation, checkValidation, signup);
router.post('/login', loginValidation, checkValidation, login);

export default router;