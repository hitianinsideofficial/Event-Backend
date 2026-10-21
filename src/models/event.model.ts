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
  mode: { type: String, enum: ['OFFLINE', 'ONLINE'], default: 'ONLINE' },
  theme: { type: String, enum: ['DEFAULT', 'TRICOLOUR'], default: 'TRICOLOUR' },
  isFlagship: { type: Boolean, default: true },
  bannerUrl: { type: String, default: '' },
  coverUrl: { type: String, default: '' },
  hasAttendance: { type: Boolean, default: false },
  requireFileUpload: { type: Boolean, default: true },
  isHidden: { type: Boolean, default: false },
  upiId: { type: String, default: '' },
  payeeName: { type: String, default: '' },
  registrationFee: { type: Schema.Types.Mixed, default: '' },
  paymentNote: { type: String, default: '' },
  upiQrUrl: { type: String, default: '' },
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

// Embedded Flagship Preset for SWARAJ-E-HIND (Independence Day Flagship Online Event)
export const SWARAJ_E_HIND_PRESET: EventItem = {
  id: 'swaraj_e_hind_preset',
  title: 'SWARAJ-E-HIND 4.0',
  description: `The official trademark Independence Day celebration event of HITian Inside! Showcasing patriotism through photography, reel making, creative writing and arts.

1. What is Swaraj-e-Hind?
Swaraj-e-Hind is more than just an event, it’s a celebration of India, its freedom, and the voices of its youth. It brings together ideas, creativity, and expressions that reflect what India means to us today.

2. What happens here?
From performances to creative expressions, Swaraj-e-Hind gives everyone a chance to share their thoughts and showcase their talent.

3. Evaluation Process
Participants will be judged on creativity, originality, relevance to the theme, and how effectively they present their ideas.

4. Value Edition
The Value Edition is about going beyond celebration and looking at the values that make us who we are—freedom, unity, courage, responsibility, and respect. Because independence isn’t just something we remember; it’s something we carry forward.`,
  date: 'Aug 15, 2026 (Deadline 11:59 PM)',
  startDate: '2026-08-01',
  endDate: '2026-08-15',
  location: 'Online Submission Portal (HITian Inside Website)',
  organizer: 'HITian Inside',
  status: 'UPCOMING',
  mode: 'ONLINE',
  theme: 'TRICOLOUR',
  isFlagship: true,
  hasAttendance: false,
  requireFileUpload: true,
  highlights: [
    { 
      title: 'Art Beyond Boundaries', 
      description: 'Photography • Digital Art\nExplore India through creativity, colour, and perspective.' 
    },
    { 
      title: 'Stories That Move', 
      description: 'Reel Making\nTurn stories of freedom and India into powerful visual narratives.' 
    },
    { 
      title: 'Words That Speak', 
      description: 'Creative Writing\nGive your thoughts a voice through stories, reflections, and imagination.' 
    }
  ],
  customFields: [
    {
      id: 'q_dept',
      label: 'Department',
      type: 'select',
      required: true,
      options: [
        'Agriculture Engineering',
        'Applied Electronics and Instrumentation Engineering',
        'Biotechnology',
        'Computer Science Engineering',
        'Computer Science Engineering (AIML)',
        'Computer Science Engineering (CS)',
        'Computer Science Engineering (DS)',
        'Chemical Engineering',
        'Electrical Engineering',
        'Electronics and Communication Engineering',
        'Information Technology',
        'Civil Engineering',
        'Food Technology',
        'Mechanical Engineering'
      ]
    },
    {
      id: 'q_year',
      label: 'Academic Year',
      type: 'select',
      required: true,
      options: [
        'First Year (26)',
        'Second Year (25)',
        'Third Year (24)',
        'Fourth Year (23)'
      ]
    },
    {
      id: 'q_roll',
      label: 'College Roll Number',
      type: 'text',
      required: true,
      description: 'Format: 25/EE/092'
    },
    {
      id: 'q_domain',
      label: 'Primary Selected Competition Domain',
      type: 'select',
      required: true,
      options: [
        'TRICOLENS (Reel Making)',
        'PATRIOT\'S PALETTE (Artwork and Digital Art)',
        'APERTURE OF FREEDOM (Photography)',
        'INKQUILAB (Creative Writing)'
      ]
    },
    {
      id: 'q_theme',
      label: 'Selected Domain Theme',
      type: 'text',
      required: true,
      description: 'Choose 1 theme for your selected domain.'
    },
    {
      id: 'q_link',
      label: 'Google Drive Video Link (Mandatory for Reels)',
      type: 'url',
      required: false,
      description: 'Mandatory for TRICOLENS Reel submissions. Ensure viewing access is set to Anyone with the link.'
    }
  ],
  createdAt: new Date().toISOString()
};


// Embedded Festive Flagship Preset for NAVROOPAM v7.0 (Durga Puja Socio-Cultural Event)
export const NAVROOPAM_PRESET: EventItem = {
  id: '6aca70825588e8009b8e8e83',
  title: 'NAVROOPAM v7.0',
  description: `The premier Socio-Cultural Festive Celebration of Durga Puja by HITian Inside! Celebrating Maa Durga’s divine arrival and youth expressions through Creative Writing, Puja Vlog (Reel Making), Puja Photography, and Artwork.

1. What is NAVROOPAM?
NAVROOPAM v7.0 is the grand Durga Puja socio-cultural celebration organized by HITian Inside (Tabloid, Media & Literary Club, HIT Haldia). It showcases student creativity, devotion, artistic culture, and festive emotions.

2. Competition Domains:
- CREATIVE WRITING: The Trishul Within, The Ashes of Mahishasura, The Third Eye, Maa Durga: Bengal’s Beloved Daughter (English, Hindi, Bengali)
- PUJA VLOG (REELS): Pandalchemy, Agomoni, Utsavnama, Pujo Diaries (Drive MP4 Link)
- PUJA PHOTOGRAPHY: Sculpting Ma Shakti, Drishtipat, Pandalverse, Saishab
- ARTWORK: Antarshakti, Avirbhava, Shakti Beyond the Idol, Navashakti

3. Registration & Pass Verification:
Symbolic fee of ₹9.00 INR per domain entry (commemorating the 9 divine days of Navratri / Durga Puja). Instant verified digital ticket pass with high-res verification QR code issued upon registration.`,
  date: 'October 10 – 24, 2026',
  startDate: '2026-10-10',
  endDate: '2026-10-24',
  location: 'Online Submission & Digital Exhibition',
  organizer: 'HITian Inside (Tabloid, Media & Literary Club)',
  status: 'UPCOMING',
  mode: 'ONLINE',
  theme: 'DEFAULT',
  isFlagship: true,
  bannerUrl: '/navroopam_banner.png',
  coverUrl: '/navroopam_banner.png',
  hasAttendance: false,
  requireFileUpload: true,
  isHidden: false,
  highlights: [
    { 
      title: 'PHOTOGRAPHY', 
      description: 'Puja Photography\nSculpting Ma Shakti • Drishtipat • Pandalverse • Saishab (Under 4 MB)' 
    },
    { 
      title: 'PUJA VLOG', 
      description: 'Reel & Video Vlog\nPandalchemy • Agomoni • Utsavnama • Pujo Diaries (Google Drive MP4 Link)' 
    },
    { 
      title: 'CREATIVE WRITING', 
      description: 'The Trishul Within • The Ashes of Mahishasura • The Third Eye • Maa Durga: Bengal’s Beloved Daughter (ENG/HIN/BEN)' 
    },
    { 
      title: 'ARTWORK', 
      description: 'Painting • Sketch • Digital Art\nAntarshakti • Avirbhava • Shakti Beyond the Idol • Navashakti (Under 4 MB)' 
    }
  ],
  customFields: [],
  createdAt: new Date().toISOString()
};

export let sampleEvents: EventItem[] = [NAVROOPAM_PRESET, SWARAJ_E_HIND_PRESET];

