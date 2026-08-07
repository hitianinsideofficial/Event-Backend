export type EventStatus = 'UPCOMING' | 'LIVE' | 'DONE';
export type EventMode = 'OFFLINE' | 'ONLINE';

export interface EventHighlight {
  icon?: string;
  title: string;
  description: string;
}

export type QuestionType = 'text' | 'textarea' | 'select' | 'checkbox' | 'radio' | 'url' | 'file' | 'image' | 'video';

export interface CustomField {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  options?: string[];
  description?: string;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  organizer: string;
  status: EventStatus;
  mode: EventMode;
  hasAttendance: boolean;
  requireFileUpload: boolean;
  highlights?: EventHighlight[];
  customFields?: CustomField[];
  createdAt: string;
}

export interface UploadedFile {
  provider?: string;
  fileId?: string;
  driveLink?: string;
  downloadLink?: string;
  localUrl: string;
  originalName: string;
  mimeType: string;
  size?: number;
}

export interface SubmissionItem {
  id: string;
  eventId: string;
  eventTitle: string;
  ticketId: string;
  fullName: string;
  email: string;
  phone?: string;
  answers?: Record<string, any>;
  files?: UploadedFile[];
  qrCodeUrl?: string;
  attendanceStatus: 'PENDING' | 'CHECKED_IN';
  checkedInAt?: string | null;
  createdAt: string;
}

export interface CertificateItem {
  certificateId: string;
  participantName: string;
  email?: string;
  eventTitle: string;
  issueDate: string;
  certificateType: string;
  issuer: string;
  status: 'VALID' | 'REVOKED';
}
