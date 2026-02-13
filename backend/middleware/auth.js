
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ; 
if(!JWT_SECRET) {
  console.error(' JWT_SECRET is not defined in environment variables');
}

export const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    console.log(' Auth header:', authHeader ? 'Present' : 'Missing');
    
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      console.log(' No token provided');
      return res.status(401).json({
        success: false,
        message: 'Access token required',
      });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        console.log(' Token verification failed:', err.message);
        return res.status(403).json({
          success: false,
          message: 'Invalid or expired token',
        });
      }

      console.log(' Token verified for user:', user.id);
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