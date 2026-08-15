import mongoose from 'mongoose';
import { EventModel, SWARAJ_E_HIND_PRESET, PRATIDHAWNI_PRESET } from '../models/event.model.js';

export async function syncSwarajEventsInDB(): Promise<void> {
  try {
    // 1. Sync Swaraj-e-Hind Preset
    const swarajEvents = await EventModel.find({
      $or: [
        { theme: 'TRICOLOUR' },
        { title: { $regex: /swaraj/i } },
        { isFlagship: true }
      ]
    });

    for (const ev of swarajEvents) {
      if (ev.title.toLowerCase().includes('pratidhawni')) continue;

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

    // 2. Ensure Pratidhawni Preset exists in MongoDB
    const existingPratidhawni = await EventModel.findOne({
      $or: [
        { title: { $regex: /pratidhawni/i } },
        { _id: 'pratidhawni' }
      ]
    });

    if (!existingPratidhawni) {
      await EventModel.create(PRATIDHAWNI_PRESET);
      console.log('✅ Seeded Pratidhawni Offline Flagship Event into MongoDB Atlas!');
    }
  } catch (err: any) {
    console.error(`⚠️ Failed to sync Swaraj/Pratidhawni events in MongoDB: ${err.message}`);
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
