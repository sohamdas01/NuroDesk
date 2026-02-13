
import dotenv from 'dotenv';
dotenv.config(); 

import app from './app.js';
import connectDB from './config/database.js';

const PORT = process.env.PORT || 5000;

// Connect DB 
await connectDB();

// Start server
app.listen(PORT, () => {
  console.log('\n' + '='.repeat(50));
  console.log('NuroDesk Server Started');
  console.log(` Port: ${PORT}`);
  console.log(` Env: ${process.env.NODE_ENV || 'development'}`);
  console.log(`jwt secret ${process.env.JWT_SECRET ? 'defined' : 'undefined'}`);
});
