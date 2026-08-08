import app from '../src/app.js';
import { connectDB } from '../src/config/database.config.js';

export default async function handler(req: any, res: any) {
  try {
    await connectDB();
  } catch (err) {
    console.error('Vercel MongoDB Atlas Connection Warning:', err);
  }
  return app(req, res);
}
