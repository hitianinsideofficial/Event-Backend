import mongoose, { Schema, Document } from 'mongoose';
import { EventItem, EventHighlight, CustomField } from '../types/backend.types.js';

export interface EventDocument extends Document, Omit<EventItem, 'id'> {}

const EventHighlightSchema = new Schema<EventHighlight>({
  icon: { type: String, default: 'Sparkles' },
  title: { type: String, required: true },
  description: { type: String, required: true }
}, { _id: false });

const CustomFieldSchema = new Schema<CustomField>({
  id: { type: String, required: true },
  label: { type: String, required: true },
  type: { type: String, required: true },
  required: { type: Boolean, default: false },
  options: [{ type: String }],
  description: { type: String }
}, { _id: false });

const EventSchema = new Schema<EventDocument>({
  title: { type: String, required: true },
  description: { type: String, required: true },
  date: { type: String, required: true },
  location: { type: String, required: true },
  organizer: { type: String, default: 'HITian Inside' },
  status: { type: String, enum: ['UPCOMING', 'LIVE', 'DONE'], default: 'UPCOMING' },
  mode: { type: String, enum: ['OFFLINE', 'ONLINE'], default: 'OFFLINE' },
  bannerUrl: { type: String, default: '' },
  coverUrl: { type: String, default: '' },
  hasAttendance: { type: Boolean, default: true },
  requireFileUpload: { type: Boolean, default: false },
  highlights: [EventHighlightSchema],
  customFields: [CustomFieldSchema],
  createdAt: { type: String, default: () => new Date().toISOString() }
});

EventSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret: Record<string, any>) => {
    if (ret._id) ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

export const EventModel = mongoose.model<EventDocument>('Event', EventSchema);

export let sampleEvents: EventItem[] = [];
