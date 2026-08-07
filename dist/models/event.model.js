import mongoose, { Schema } from 'mongoose';
const EventHighlightSchema = new Schema({
    icon: { type: String, default: '✨' },
    title: { type: String, required: true },
    description: { type: String, required: true }
}, { _id: false });
const CustomFieldSchema = new Schema({
    id: { type: String, required: true },
    label: { type: String, required: true },
    type: { type: String, required: true },
    required: { type: Boolean, default: false },
    options: [{ type: String }],
    description: { type: String }
}, { _id: false });
const EventSchema = new Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    date: { type: String, required: true },
    location: { type: String, required: true },
    organizer: { type: String, default: 'HITian Inside' },
    hasAttendance: { type: Boolean, default: true },
    requireFileUpload: { type: Boolean, default: false },
    highlights: [EventHighlightSchema],
    customFields: [CustomFieldSchema],
    createdAt: { type: String, default: () => new Date().toISOString() }
});
EventSchema.set('toJSON', {
    virtuals: true,
    transform: (doc, ret) => {
        if (ret._id)
            ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
    }
});
export const EventModel = mongoose.model('Event', EventSchema);
// Empty sample array (no dummy events)
export let sampleEvents = [];
