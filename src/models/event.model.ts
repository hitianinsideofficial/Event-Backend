import { EventItem } from '../types/backend.types.js';

export let events: EventItem[] = [
  {
    id: '1',
    title: 'HITian Tech Symposium 2026',
    description: 'Annual technical symposium featuring workshops, hackathons, and guest lectures. Upload your project proposal or presentation slides upon registration.',
    date: '2026-09-15',
    location: 'Main Auditorium',
    organizer: 'HITian Tech Club',
    hasAttendance: true,
    requireFileUpload: true,
    customFields: [
      { id: 'field_dept', label: 'Department / Year', type: 'text', required: true },
      { id: 'field_phone', label: 'WhatsApp / Phone Number', type: 'tel', required: true }
    ],
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    title: 'Design-a-Thon UI/UX Contest',
    description: '24-hour UI/UX design challenge. Submit your portfolio link and past design samples PNG or PDF.',
    date: '2026-10-02',
    location: 'Lab 3, IT Building',
    organizer: 'Creative Wing',
    hasAttendance: true,
    requireFileUpload: true,
    customFields: [
      { id: 'field_portfolio', label: 'Portfolio Link (Behance/Figma)', type: 'text', required: false }
    ],
    createdAt: new Date().toISOString()
  }
];
