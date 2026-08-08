import mongoose from 'mongoose';

export async function connectDB(): Promise<void> {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.warn('⚠️ MONGODB_URI not found in process.env. Running in offline fallback mode.');
    return;
  }

  try {
    const conn = await mongoose.connect(mongoURI, {
      family: 4
    });
    console.log(`🍃 MongoDB Connected: ${conn.connection.host} (DB: ${conn.connection.name})`);
  } catch (error: any) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.warn('⚠️ Proceeding with in-memory store fallback.');
  }
}
