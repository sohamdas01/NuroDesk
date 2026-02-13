
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET ;
if(!JWT_SECRET) {
  console.error(' JWT_SECRET is not defined in environment variables');
}

export async function registerUser({ name, email, password }) {
  try {
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw new Error('User already exists');
    }

    const user = new User({
      name,
      email: email.toLowerCase(),
      password,
    });

    await user.save();

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      user: user.toPublicJSON(),
      token,
    };
  } catch (error) {
    console.error(' Registration error:', error);
    throw error;
  }
}

export async function loginUser({ email, password }) {
  try {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new Error('Invalid email or password');
    }

    user.lastLogin = new Date();
    await user.save();

    const token = jwt.sign(
      { id: user._id.toString(), email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      user: user.toPublicJSON(),
      token,
    };
  } catch (error) {
    console.error(' Login error:', error);
    throw error;
  }
}

export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
}

export async function getUserById(userId) {
  try {
    const user = await User.findById(userId).select('-password');
    if (!user) {
      throw new Error('User not found');
    }

    return user.toPublicJSON();
  } catch (error) {
    throw new Error('User not found');
  }
}

export default { registerUser, loginUser, verifyToken, getUserById };