import mongoose, { Schema } from 'mongoose';
const EventHighlightSchema = new Schema({
    icon: { type: String, default: 'Sparkles' },
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
// Embedded Flagship Preset for SWARAJ-E-HIND (Independence Day Flagship Online Event)
export const SWARAJ_E_HIND_PRESET = {
    id: 'swaraj_e_hind_preset',
    title: 'SWARAJ-E-HIND 4.0',
    description: 'The official trademark Independence Day online submission event of HITian Inside! Showcasing freedom and national pride across 4 domains: Reel Making (TRICOLENS), Artwork & Digital Art (PATRIOT\'S PALETTE), Photography (APERTURE OF FREEDOM), and Creative Writing (INKQUILAB). Deadline: 15 August, 11:59 pm.',
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
        { title: 'TRICOLENS (Reel Making)', description: 'Themes: The Price of Freedom | One Minute Through India\'s Journey | The Cost of One Flag (Mandatory Google Drive Link)' },
        { title: 'PATRIOT\'S PALETTE (Artwork & Digital Art)', description: 'Themes: Threads of Unity | Pixels of Patriotism | Youth: The Voice and Today (JPG/PNG/PSD/AI, Max 100MB)' },
        { title: 'APERTURE OF FREEDOM (Photography)', description: 'Themes: Roots of India | Unsung Heroes | Tiranga Palette (JPG/PNG, Max 100MB)' },
        { title: 'INKQUILAB (Creative Writing)', description: 'Themes: The Price of Silence | Dreaming India 2047 | The Railway Platform, 1947 (PDF/DOC, 300 words max, Max 10MB)' }
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
                'Third Year (27)',
                'Fourth Year (28)'
            ]
        },
        {
            id: 'q_roll',
            label: 'College Roll Number',
            type: 'text',
            required: true,
            description: 'Format: [Year_code]/[Dept_code]/[number] (e.g. 26/CSE/042)'
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
export let sampleEvents = [SWARAJ_E_HIND_PRESET];
