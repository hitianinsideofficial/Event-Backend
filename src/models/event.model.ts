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
  startDate: { type: String, default: '' },
  endDate: { type: String, default: '' },
  location: { type: String, required: true },
  organizer: { type: String, default: 'HITian Inside' },
  status: { type: String, enum: ['UPCOMING', 'LIVE', 'DONE'], default: 'UPCOMING' },
  mode: { type: String, enum: ['OFFLINE', 'ONLINE'], default: 'OFFLINE' },
  theme: { type: String, enum: ['DEFAULT', 'TRICOLOUR'], default: 'DEFAULT' },
  isFlagship: { type: Boolean, default: false },
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

// Embedded Flagship Preset for Swaraj-E-Hind (Independence Day Celebration)
export const SWARAJ_E_HIND_PRESET: EventItem = {
  id: 'swaraj_e_hind_preset',
  title: 'SWARAJ-E-HIND 4.0',
  description: 'The official trademark Independence Day celebration event of HITian Inside! Showcasing patriotism through music, dance, poetry, drama, and digital arts.',
  date: 'Aug 15, 2026',
  startDate: '2026-08-15',
  endDate: '2026-08-15',
  location: 'Main Campus Auditorium & Open Air Stage',
  organizer: 'HITian Inside',
  status: 'UPCOMING',
  mode: 'OFFLINE',
  theme: 'TRICOLOUR',
  isFlagship: true,
  hasAttendance: true,
  requireFileUpload: false,
  highlights: [
    { title: 'Grand Stage Performances', description: 'Patriotic Singing, Dancing & Drama Skits' },
    { title: 'Poetry & Declamation', description: 'Recitation and Freedom Keynote Speeches' },
    { title: 'Digital Arts Showcase', description: 'Patriotic Painting & Photography Exhibition' }
  ],
  customFields: [
    { id: 'q_dept', label: 'Department & Academic Year', type: 'text', required: true },
    { 
      id: 'q_category', 
      label: 'Participation Category', 
      type: 'select', 
      required: true,
      options: [
        'Patriotic Song / Music',
        'Solo / Group Dance',
        'Poetry Recitation / Speech',
        'Drama / Skit',
        'Photography / Painting',
        'General Attendee / Audience'
      ]
    },
    { id: 'q_link', label: 'Portfolio / Past Performance Video Link (Optional)', type: 'url', required: false }
  ],
  createdAt: new Date().toISOString()
};

export let sampleEvents: EventItem[] = [SWARAJ_E_HIND_PRESET];
