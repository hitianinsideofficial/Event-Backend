import mongoose, { Schema } from 'mongoose';
const CertificateSchema = new Schema({
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
    transform: (doc, ret) => {
        if (ret._id)
            ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});
export const CertificateModel = mongoose.model('Certificate', CertificateSchema);
export let sampleCertificates = [
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
