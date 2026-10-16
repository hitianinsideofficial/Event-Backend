import mongoose, { Schema, Document } from 'mongoose';
import { SubmissionItem, UploadedFile } from '../types/backend.types.js';

export interface SubmissionDocument extends Document, Omit<SubmissionItem, 'id'> {}

const UploadedFileSchema = new Schema<UploadedFile>({
  provider: { type: String, default: 'local' },
  fileId: { type: String },
  driveLink: { type: String },
  downloadLink: { type: String },
  localUrl: { type: String, required: true },
  originalName: { type: String, required: true },
  mimeType: { type: String, required: true },
  size: { type: Number }
}, { _id: false });

const SubmissionSchema = new Schema<SubmissionDocument>({
  eventId: { type: String, required: true, index: true },
  eventTitle: { type: String, required: true },
  ticketId: { type: String, required: true, unique: true, index: true },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  answers: { type: Schema.Types.Mixed, default: {} },
  files: [UploadedFileSchema],
  qrCodeUrl: { type: String },
  attendanceStatus: { type: String, enum: ['PENDING', 'CHECKED_IN'], default: 'PENDING' },
  checkedInAt: { type: String, default: null },
  acknowledged: { type: Boolean, default: false },
  acknowledgedAt: { type: String, default: null },
  confirmationEmailSent: { type: Boolean, default: false },
  confirmationEmailSentAt: { type: String, default: null },
  instagramPostUrl: { type: String, default: null },
  postingStatus: { type: String, enum: ['QUALIFIED', 'POSTED', 'DISQUALIFIED', 'MAIL_SENT', null], default: null },
  moveToPostingExcel: { type: Boolean, default: false },
  isDriveNotPublic: { type: Boolean, default: false },
  isDriveNotPublicReason: { type: String, default: null },
  driveLinkUpdateToken: { type: String, default: null },
  driveLinkUpdated: { type: Boolean, default: false },
  driveLinkUpdatedAt: { type: String, default: null },
  driveUpdateMailSent: { type: Boolean, default: false },
  driveUpdateMailSentAt: { type: String, default: null },
  resubmissionToken: { type: String, default: null },
  resubmissionRequested: { type: Boolean, default: false },
  resubmissionRequestedAt: { type: String, default: null },
  resubmissionReason: { type: String, default: null },
  resubmissionCompleted: { type: Boolean, default: false },
  resubmissionCompletedAt: { type: String, default: null },
  appreciationSent: { type: Boolean, default: false },
  appreciationSentAt: { type: String, default: null },
  certificateFileUrl: { type: String, default: null },
  couponCollected: { type: Boolean, default: false },
  paymentStatus: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED', 'PAID'], default: 'PENDING' },
  paymentVerifiedAt: { type: String, default: null },
  createdAt: { type: String, default: () => new Date().toISOString() }
});

SubmissionSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret: Record<string, any>) => {
    if (ret._id) ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const SubmissionModel = mongoose.model<SubmissionDocument>('Submission', SubmissionSchema);

// Empty sample array (no dummy submissions)
export let sampleSubmissions: SubmissionItem[] = [];
