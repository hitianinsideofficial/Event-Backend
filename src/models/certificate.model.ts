import mongoose, { Schema, Document } from 'mongoose';
import { CertificateItem } from '../types/backend.types.js';

export interface CertificateDocument extends Document, Omit<CertificateItem, 'id'> {}

const CertificateSchema = new Schema<CertificateDocument>({
  certificateId: { type: String, required: true, unique: true, index: true },
  participantName: { type: String, required: true },
  email: { type: String },
  eventTitle: { type: String, required: true },
  issueDate: { type: String, required: true },
  certificateType: { type: String, default: 'Certificate of Participation' },
  issuer: { type: String, default: 'HITian Inside Official' },
  status: { type: String, enum: ['VALID', 'REVOKED'], default: 'VALID' }
});

CertificateSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret: Record<string, any>) => {
    if (ret._id) ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const CertificateModel = mongoose.model<CertificateDocument>('Certificate', CertificateSchema);

export let sampleCertificates: CertificateItem[] = [
  {
    certificateId: 'CERT-HIT-2026-X891',
    participantName: 'Alex Johnson',
    email: 'alex.johnson@hit.edu',
    eventTitle: 'HITian Tech Symposium 2026',
    issueDate: '2026-09-16',
    certificateType: 'Certificate of Excellence',
    issuer: 'HITian Inside Official',
    status: 'VALID'
  }
];
