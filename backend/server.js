import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import connectDB from './config/database.js';
import { initializeQdrant } from './config/qdrant.js';
import { PORT } from './config/constants.js';

// Connect to MongoDB
await connectDB();

// Ensure Qdrant collection exists 
try {
  await initializeQdrant();
} catch (err) {
  console.error('  Qdrant init warning:', err.message);
}

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('NuroDesk Server Started');
  console.log(` Port: ${PORT}`);
  console.log(` Env: ${process.env.NODE_ENV || 'development'}`);
  console.log('='.repeat(50));
});
