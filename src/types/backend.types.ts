export type EventStatus = 'UPCOMING' | 'LIVE' | 'DONE';
export type EventMode = 'OFFLINE' | 'ONLINE';
export type EventTheme = 'DEFAULT' | 'TRICOLOUR';

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
  startDate?: string;
  endDate?: string;
  location: string;
  organizer: string;
  status: EventStatus;
  mode: EventMode;
  theme?: EventTheme;
  isFlagship?: boolean;
  bannerUrl?: string;
  coverUrl?: string;
  hasAttendance: boolean;
  requireFileUpload: boolean;
  isHidden?: boolean;
  upiId?: string;
  payeeName?: string;
  registrationFee?: string | number;
  paymentNote?: string;
  upiQrUrl?: string;
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
  acknowledged?: boolean;
  acknowledgedAt?: string | null;
  confirmationEmailSent?: boolean;
  confirmationEmailSentAt?: string | null;
  instagramPostUrl?: string | null;
  postingStatus?: 'QUALIFIED' | 'POSTED' | 'DISQUALIFIED' | 'MAIL_SENT' | null;
  moveToPostingExcel?: boolean;
  isDriveNotPublic?: boolean;
  isDriveNotPublicReason?: string | null;
  driveLinkUpdateToken?: string | null;
  driveLinkUpdated?: boolean;
  driveLinkUpdatedAt?: string | null;
  driveUpdateMailSent?: boolean;
  driveUpdateMailSentAt?: string | null;
  resubmissionToken?: string | null;
  resubmissionRequested?: boolean;
  resubmissionRequestedAt?: string | null;
  resubmissionReason?: string | null;
  resubmissionCompleted?: boolean;
  resubmissionCompletedAt?: string | null;
  appreciationSent?: boolean;
  appreciationSentAt?: string | null;
  certificateFileUrl?: string | null;
  couponCollected?: boolean;
  paymentStatus?: 'PENDING' | 'VERIFIED' | 'REJECTED' | 'PAID';
  paymentVerifiedAt?: string | null;
  winnerPosition?: '1st' | '2nd' | '3rd' | null;
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
