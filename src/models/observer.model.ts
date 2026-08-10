import mongoose, { Schema, Document } from 'mongoose';

export interface ObserverItem {
  id?: string;
  email: string;
  password: string;
  name: string;
  isActive: boolean;
  createdAt: string;
}

export interface ObserverDocument extends Document {
  email: string;
  password: string;
  name: string;
  isActive: boolean;
  createdAt: Date;
}

const ObserverSchema = new Schema<ObserverDocument>({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now }
});

ObserverSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret: Record<string, any>) => {
    if (ret._id) ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.password; // Do not leak password in JSON output
    return ret;
  }
});

export const ObserverModel = mongoose.model<ObserverDocument>('Observer', ObserverSchema);

// In-Memory Fallback Store
export const sampleObservers: ObserverItem[] = [];
