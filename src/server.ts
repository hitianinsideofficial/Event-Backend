import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/database.config.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Initialize MongoDB Atlas connection before starting server listener
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Express Server connected to MongoDB Atlas on port ${PORT}`);
  });
});
