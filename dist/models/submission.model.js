import mongoose, { Schema } from 'mongoose';
const UploadedFileSchema = new Schema({
    provider: { type: String, default: 'local' },
    fileId: { type: String },
    driveLink: { type: String },
    downloadLink: { type: String },
    localUrl: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number }
}, { _id: false });
const SubmissionSchema = new Schema({
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
    createdAt: { type: String, default: () => new Date().toISOString() }
});
SubmissionSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        if (ret._id)
            ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});
export const SubmissionModel = mongoose.model('Submission', SubmissionSchema);
// Empty sample array (no dummy submissions)
export let sampleSubmissions = [];
