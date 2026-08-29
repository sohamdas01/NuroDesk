
import jwt from 'jsonwebtoken';
import { JWT_SECRET, NODE_ENV } from '../config/constants.js';

const isDev = NODE_ENV === 'development';

export const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    if (isDev) console.log(' Auth header:', authHeader ? 'Present' : 'Missing');
    
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      if (isDev) console.log(' No token provided');
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        if (isDev) console.log(' Token verification failed:', err.message);
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired token',
        });
      }

      if (isDev) console.log(' Token verified for user:', user.id);
      req.user = user;
      next();
    });
  } catch (error) {
    console.error(' Auth middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication error',
    });
  }
};

export default authenticateToken;