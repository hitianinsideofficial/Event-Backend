import dotenv from 'dotenv';
import app from './app.js';
import { connectDB } from './config/database.config.js';

dotenv.config();

const PORT = process.env.PORT || 5000;

// Initialize MongoDB Atlas connection before starting server listener
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Express Server connected to MongoDB Atlas on port ${PORT}`);

    // Self-ping to keep Render awake during active hours (every 10 minutes)
    const RENDER_EXTERNAL_URL = process.env.RENDER_EXTERNAL_URL || 'https://event-backend-29dm.onrender.com';
    if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
      setInterval(async () => {
        try {
          await fetch(`${RENDER_EXTERNAL_URL}/api/health`);
          console.log(`[Keep-Alive] Pinged ${RENDER_EXTERNAL_URL}/api/health successfully.`);
        } catch (err: any) {
          console.warn('[Keep-Alive] Ping warning:', err.message);
        }
      }, 10 * 60 * 1000); // 10 minutes
    }
  });
});
