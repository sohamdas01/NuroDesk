
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI ;

export async function connectDB() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB connected successfully');
    console.log(` Database: ${mongoose.connection.name}`);
  } catch (error) {
    console.error(' MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

export default connectDB;