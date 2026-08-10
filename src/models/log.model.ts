import mongoose, { Schema, Document } from 'mongoose';

export interface LoginLogItem {
  id?: string;
  email: string;
  role: 'admin' | 'observer';
  status: 'SUCCESS' | 'FAILED';
  ip?: string;
  userAgent?: string;
  createdAt: string;
}

export interface LoginLogDocument extends Document {
  email: string;
  role: 'admin' | 'observer';
  status: 'SUCCESS' | 'FAILED';
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

const LoginLogSchema = new Schema<LoginLogDocument>({
  email: { type: String, required: true, lowercase: true, trim: true },
  role: { type: String, enum: ['admin', 'observer'], required: true },
  status: { type: String, enum: ['SUCCESS', 'FAILED'], required: true },
  ip: { type: String, default: '127.0.0.1' },
  userAgent: { type: String, default: 'Browser' },
  createdAt: { type: Date, default: Date.now }
});

LoginLogSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret: Record<string, any>) => {
    if (ret._id) ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const LoginLogModel = mongoose.model<LoginLogDocument>('LoginLog', LoginLogSchema);

// Memory fallback store
export const sampleLoginLogs: LoginLogItem[] = [
  {
    id: 'log_1',
    email: 'admin@hitianinside.org',
    role: 'admin',
    status: 'SUCCESS',
    ip: '127.0.0.1',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  }
];
