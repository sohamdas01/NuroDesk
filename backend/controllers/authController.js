
import { registerUser, loginUser, getUserById } from '../services/authService.js';

  // Handle user signup 
export async function signup(req, res, next) {
  try {
    const { name, email, password } = req.body;

    const result = await registerUser({ name, email, password });

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
}

  // Handle user login
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const result = await loginUser({ email, password });

    res.json({
      success: true,
      message: 'Login successful',
      token: result.token,
      user: result.user,
    });
  } catch (error) {
    next(error);
  }
}


  // Get current user info
 
export async function getCurrentUser(req, res, next) {
  try {
    const user = await getUserById(req.user.id); // use id from token middleware

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
}

export default {
  signup,
  login,
  getCurrentUser,
};