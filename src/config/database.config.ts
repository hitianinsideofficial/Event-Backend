import mongoose from 'mongoose';
import { EventModel, SWARAJ_E_HIND_PRESET } from '../models/event.model.js';

export async function syncSwarajEventsInDB(): Promise<void> {
  try {
    const swarajEvents = await EventModel.find({
      $or: [
        { theme: 'TRICOLOUR' },
        { title: { $regex: /swaraj/i } },
        { isFlagship: true }
      ]
    });

    for (const ev of swarajEvents) {
      const needsUpdate = !ev.highlights || ev.highlights.some((h: any) => 
        h.title?.includes('Grand Stage') || 
        h.title?.includes('Poetry') || 
        h.title?.includes('Digital Arts') ||
        h.title?.startsWith('1.')
      );

      if (needsUpdate) {
        ev.highlights = SWARAJ_E_HIND_PRESET.highlights;
        ev.description = SWARAJ_E_HIND_PRESET.description;
        await ev.save();
        console.log(`✅ Synced updated Swaraj-e-Hind highlights & description to MongoDB document: ${ev._id}`);
      }
    }
  } catch (err: any) {
    console.error(`⚠️ Failed to sync Swaraj events in MongoDB: ${err.message}`);
  }
}

export async function connectDB(): Promise<void> {
  const mongoURI = process.env.MONGODB_URI;

  if (mongoose.connection.readyState >= 1) {
    return;
  }

  if (!mongoURI) {
    console.warn('⚠️ MONGODB_URI not found in process.env. Running in offline fallback mode.');
    return;
  }

  try {
    const conn = await mongoose.connect(mongoURI, {
      family: 4
    });
    console.log(`🍃 MongoDB Connected: ${conn.connection.host} (DB: ${conn.connection.name})`);
    await syncSwarajEventsInDB();
  } catch (error: any) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    console.warn('⚠️ Proceeding with in-memory store fallback.');
  }
}
