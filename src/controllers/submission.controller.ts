import { Request, Response } from 'express';
import fs from 'fs';
import crypto from 'crypto';
import QRCode from 'qrcode';
import { uploadFileToDriveOrLocal } from '../services/googledrive.service.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../services/cloudinary.service.js';
import { EventModel } from '../models/event.model.js';
import { SubmissionModel, sampleSubmissions } from '../models/submission.model.js';
import { SubmissionItem, UploadedFile } from '../types/backend.types.js';
import { 
  sendRegistrationConfirmationEmail, 
  sendSubmissionAcknowledgmentEmail, 
  sendPratidhwaniConfirmationEmail, 
  sendNavroopamConfirmationEmail, 
  sendSubmissionReceivedEmail,
  sendParticipationAppreciationEmail,
  sendDriveLinkUpdateEmail,
  sendResubmissionRequestEmail
} from '../services/brevo.service.js';
import { uploadImageToImageKit, deleteFromImageKit } from '../services/imagekit.service.js';

// Helper to normalize roll number strings e.g. 26/CSE/092 -> 26/CSE/92
function normalizeRollString(rollStr: string): string {
  if (!rollStr) return '';
  const parts = rollStr.trim().split('/');
  if (parts.length === 3) {
    const yearCode = parts[0].trim();
    const deptCode = parts[1].trim();
    const cleanNum = parts[2].trim().replace(/^0+/, '') || '0';
    return `${yearCode}/${deptCode}/${cleanNum}`;
  }
  return rollStr.trim().toLowerCase();
}

// Dynamically determine the frontend URL based on the incoming request, environment variables, or production domain
function getFrontendBaseUrl(req: Request): string {
  // 1. Check Origin or Referer header from the admin browser session
  const origin = req.get('origin');
  if (origin && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
    return origin.replace(/\/+$/, '');
  }

  const referer = req.get('referer');
  if (referer) {
    try {
      const parsed = new URL(referer);
      if (parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1') {
        return `${parsed.protocol}//${parsed.host}`;
      }
    } catch (_) {}
  }

  // 2. Check environment variables
  if (process.env.FRONTEND_URL && !process.env.FRONTEND_URL.includes('localhost')) {
    return process.env.FRONTEND_URL.replace(/\/+$/, '');
  }
  if (process.env.CLIENT_URL && !process.env.CLIENT_URL.includes('localhost')) {
    return process.env.CLIENT_URL.replace(/\/+$/, '');
  }

  // 3. If NODE_ENV is production, default to production domain
  if (process.env.NODE_ENV === 'production') {
    return 'https://events.hitianinside.in';
  }

  // 4. Fallback to origin header if available or configured env
  return (origin || process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

export const submitRegistration = async (req: Request, res: Response) => {
  try {
    const { eventId, fullName, email, phone, answers } = req.body;

    if (!fullName || !fullName.trim()) {
      return res.status(400).json({
        success: false,
        errorCode: 'MISSING_NAME',
        message: 'Participant Full Name is required.'
      });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({
        success: false,
        errorCode: 'MISSING_EMAIL',
        message: 'Valid Email address is required to receive event updates.'
      });
    }

    // Basic email structure check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({
        success: false,
        errorCode: 'INVALID_EMAIL_FORMAT',
        message: `The email address "${email}" is invalid. Please check for spelling mistakes.`
      });
    }

    if (!phone || !phone.trim()) {
      return res.status(400).json({
        success: false,
        errorCode: 'MISSING_PHONE',
        message: 'Active 10-digit WhatsApp/Mobile Number is required.'
      });
    }

    if (!eventId) {
      return res.status(400).json({
        success: false,
        errorCode: 'MISSING_EVENT_ID',
        message: 'Event identifier is missing. Please reload the registration page.'
      });
    }

    let parsedAnswers: Record<string, any> = {};
    if (typeof answers === 'string') {
      try { parsedAnswers = JSON.parse(answers); } catch (e) {}
    } else if (typeof answers === 'object' && answers !== null) {
      parsedAnswers = answers;
    }

    const selectedDomain = parsedAnswers['Selected Domain'];
    const collegeRoll = parsedAnswers['College Roll Number'];

    // Check duplicate domain submission for the normalized roll number (092 === 92)
    if (selectedDomain && collegeRoll) {
      const normRoll = normalizeRollString(collegeRoll);
      
      try {
        const existingSubs = await SubmissionModel.find({ eventId });
        const duplicate = existingSubs.find(sub => {
          const subRoll = normalizeRollString(sub.answers?.['College Roll Number'] || '');
          const subDomain = sub.answers?.['Selected Domain'];
          return subRoll === normRoll && subDomain === selectedDomain;
        });

        if (duplicate) {
          return res.status(400).json({
            success: false,
            errorCode: 'DUPLICATE_DOMAIN_SUBMISSION',
            message: `You have ALREADY submitted an entry for "${selectedDomain}" under Roll Number ${collegeRoll}. Each student can submit only once per domain.`
          });
        }
      } catch (checkErr) {
        const sampleDup = sampleSubmissions.find(sub => {
          const subRoll = normalizeRollString(sub.answers?.['College Roll Number'] || '');
          const subDomain = sub.answers?.['Selected Domain'];
          return sub.eventId === eventId && subRoll === normRoll && subDomain === selectedDomain;
        });
        if (sampleDup) {
          return res.status(400).json({
            success: false,
            errorCode: 'DUPLICATE_DOMAIN_SUBMISSION',
            message: `You have ALREADY submitted an entry for "${selectedDomain}" under Roll Number ${collegeRoll}. Each student can submit only once per domain.`
          });
        }
      }
    }

    let eventTitle = 'Event Registration';
    let eventDate = 'TBD';
    let location = 'Main Campus';
    try {
      if (typeof eventId === 'string' && eventId.match(/^[0-9a-fA-F]{24}$/)) {
        const ev = await EventModel.findById(eventId);
        if (ev) {
          eventTitle = ev.title;
          eventDate = ev.date;
          location = ev.location;
        }
      }
    } catch (e) {}

    const randomHex = Math.random().toString(36).substring(2, 8).toUpperCase();
    const ticketId = `HIT-EVT-${randomHex}`;

    const files: UploadedFile[] = [];
    const uploadedFilesList: Express.Multer.File[] = [];
    if (req.file) {
      uploadedFilesList.push(req.file);
    } else if (Array.isArray(req.files)) {
      uploadedFilesList.push(...req.files);
    } else if (req.files && typeof req.files === 'object') {
      Object.values(req.files).forEach(fileArray => {
        if (Array.isArray(fileArray)) {
          uploadedFilesList.push(...fileArray);
        }
      });
    }

    // Determine event folder name for Cloudinary (e.g., 'navroopam', 'pratidhwani', 'swaraj_e_hind', or clean title)
    const cleanEventFolder = (eventTitle || 'hitian_events')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'hitian_events';

    for (const uploadedFile of uploadedFilesList) {
      try {
        const fileBuffer = uploadedFile.buffer;
        const isProof = uploadedFile.fieldname === 'paymentProof' || (uploadedFile.originalname || '').toLowerCase().includes('proof') || (uploadedFile.originalname || '').toLowerCase().includes('payment') || (uploadedFile.originalname || '').toLowerCase().includes('utr') || (uploadedFile.originalname || '').toLowerCase().includes('screen');
        const origName = isProof && !(uploadedFile.originalname || '').toLowerCase().includes('proof') ? `payment_proof_${uploadedFile.originalname}` : uploadedFile.originalname;

        // 1. If PDF document, prioritize ImageKit (publicly accessible 200 OK without Cloudinary strict ACL blocks)
        if (fileBuffer && uploadedFile.mimetype === 'application/pdf') {
          const ikRes = await uploadImageToImageKit(fileBuffer, origName, `/${cleanEventFolder}`).catch(() => null);
          if (ikRes && ikRes.url) {
            files.push({
              provider: isProof ? 'cloudinary_payment_proof' : 'imagekit',
              fileId: ikRes.fileId,
              driveLink: ikRes.url,
              downloadLink: ikRes.url,
              localUrl: ikRes.url,
              originalName: origName,
              mimeType: uploadedFile.mimetype,
              size: uploadedFile.size
            });
            continue;
          }
        }

        // 2. Primary Target for Images: Cloudinary (Fast CDN delivery)
        if (fileBuffer && uploadedFile.mimetype.startsWith('image/')) {
          const cloudRes = await uploadToCloudinary(fileBuffer, origName, cleanEventFolder, 'image').catch(() => null);
          if (cloudRes && cloudRes.secureUrl) {
            files.push({
              provider: isProof ? 'cloudinary_payment_proof' : 'cloudinary',
              fileId: cloudRes.publicId,
              driveLink: cloudRes.secureUrl,
              downloadLink: cloudRes.secureUrl,
              localUrl: cloudRes.secureUrl,
              originalName: origName,
              mimeType: uploadedFile.mimetype,
              size: cloudRes.bytes || uploadedFile.size
            });
            continue;
          }
        }

        // 3. Secondary Target: ImageKit (General Fallback)
        if (fileBuffer) {
          const ikRes = await uploadImageToImageKit(fileBuffer, origName, `/${cleanEventFolder}`).catch(() => null);
          if (ikRes && ikRes.url) {
            files.push({
              provider: isProof ? 'cloudinary_payment_proof' : 'imagekit',
              fileId: ikRes.fileId,
              driveLink: ikRes.url,
              downloadLink: ikRes.url,
              localUrl: ikRes.url,
              originalName: origName,
              mimeType: uploadedFile.mimetype,
              size: uploadedFile.size
            });
            continue;
          }
        }

        // 3. Tertiary Target: Google Drive
        const fileData = await uploadFileToDriveOrLocal(uploadedFile, req).catch(() => null);
        if (fileData && fileData.provider === 'google_drive') {
          if (isProof) fileData.provider = 'cloudinary_payment_proof';
          files.push(fileData);
          continue;
        }

        // 4. Fallback: Memory data URI
        const base64Data = fileBuffer ? `data:${uploadedFile.mimetype};base64,${fileBuffer.toString('base64')}` : '';
        const fallbackUrl = base64Data || `https://via.placeholder.com/800x600.png?text=${encodeURIComponent(origName)}`;
        files.push({
          provider: isProof ? 'cloudinary_payment_proof' : 'memory_fallback',
          localUrl: fallbackUrl,
          driveLink: fallbackUrl,
          originalName: origName,
          mimeType: uploadedFile.mimetype,
          size: uploadedFile.size
        });
      } catch (fileErr: any) {
        console.error('File Upload Buffer Processing Warning:', fileErr.message);
        const isProof = uploadedFile.fieldname === 'paymentProof' || (uploadedFile.originalname || '').toLowerCase().includes('proof');
        const origName = isProof && !(uploadedFile.originalname || '').toLowerCase().includes('proof') ? `payment_proof_${uploadedFile.originalname}` : uploadedFile.originalname;
        const base64Data = uploadedFile.buffer ? `data:${uploadedFile.mimetype};base64,${uploadedFile.buffer.toString('base64')}` : '';
        const fallbackUrl = base64Data || `https://via.placeholder.com/800x600.png?text=${encodeURIComponent(origName)}`;
        files.push({
          provider: isProof ? 'cloudinary_payment_proof' : 'memory_fallback',
          localUrl: fallbackUrl,
          driveLink: fallbackUrl,
          originalName: origName,
          mimeType: uploadedFile.mimetype,
          size: uploadedFile.size
        });
      }
    }

    const qrPayload = JSON.stringify({ ticketId, eventId, name: fullName, email });
    const qrCodeUrl = await QRCode.toDataURL(qrPayload, {
      color: { dark: '#1e1b4b', light: '#ffffff' },
      width: 300
    });

    // NOTE: Automated email dispatch on registration is disabled.
    // Emails (acknowledgment / confirmation) are now sent manually by Admin after payment verification from the Admin Panel.

    try {
      const newDoc = await SubmissionModel.create({
        eventId,
        eventTitle,
        ticketId,
        fullName,
        email,
        phone: phone || '',
        answers: parsedAnswers,
        files,
        qrCodeUrl,
        attendanceStatus: 'PENDING',
        checkedInAt: null
      });

      return res.status(201).json({
        success: true,
        message: 'Registration successful! Ticket saved to MongoDB Atlas.',
        data: newDoc
      });
    } catch (dbErr) {
      const newSubmission: SubmissionItem = {
        id: Date.now().toString(),
        eventId,
        eventTitle,
        ticketId,
        fullName,
        email,
        phone: phone || '',
        answers: parsedAnswers,
        files,
        qrCodeUrl,
        attendanceStatus: 'PENDING',
        checkedInAt: null,
        createdAt: new Date().toISOString()
      };
      sampleSubmissions.unshift(newSubmission);

      return res.status(201).json({
        success: true,
        message: 'Registration successful! Ticket issued.',
        data: newSubmission
      });
    }
  } catch (error: any) {
    console.error('Submission Processing Failure [submitRegistration]:', error);

    // 1. MongoDB Duplicate Key (E11000)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'unique field';
      return res.status(409).json({
        success: false,
        errorCode: 'DUPLICATE_ENTRY',
        message: `A submission with this ${field} already exists in the database. If you believe this is an error, please contact the coordinator desk.`
      });
    }

    // 2. Mongoose Schema Validation Error
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors || {}).map((e: any) => e.message).join('; ');
      return res.status(400).json({
        success: false,
        errorCode: 'SCHEMA_VALIDATION_ERROR',
        message: `Validation error: ${messages}`
      });
    }

    // 3. Cloud / Third-party Network Timeout
    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNRESET' || error.message?.includes('timeout')) {
      return res.status(504).json({
        success: false,
        errorCode: 'CLOUD_STORAGE_TIMEOUT',
        message: 'Cloud media upload timed out due to slow network. Please compress your files or paste a Google Drive link.'
      });
    }

    return res.status(500).json({
      success: false,
      errorCode: error.code || 'REGISTRATION_PROCESSING_FAILED',
      message: `Failed to complete registration: ${error.message || 'Internal server error'}. Please report this with error code.`
    });
  }
};

export const getEventSubmissions = async (req: Request, res: Response) => {
  try {
    const eventId = (req.params.eventId || req.query.eventId) as string;
    
    let filter: any = {};
    if (eventId && eventId !== 'all') {
      filter.eventId = eventId;
    }

    const subs = await SubmissionModel.find(filter).sort({ createdAt: -1 });

    if (subs && subs.length > 0) {
      return res.status(200).json({
        success: true,
        count: subs.length,
        data: subs
      });
    }

    let sampleResult = sampleSubmissions;
    if (eventId && eventId !== 'all') {
      sampleResult = sampleSubmissions.filter(s => s.eventId === eventId);
    }

    return res.status(200).json({
      success: true,
      count: sampleResult.length,
      data: sampleResult
    });
  } catch (error: any) {
    return res.status(200).json({
      success: true,
      count: sampleSubmissions.length,
      data: sampleSubmissions
    });
  }
};

export const getSubmissionByTicket = async (req: Request, res: Response) => {
  const ticketId = (req.params.ticketId as string || '').toUpperCase();
  const sample = sampleSubmissions.find(s => s.ticketId.toUpperCase() === ticketId);

  try {
    const submission = await SubmissionModel.findOne({ ticketId });
    if (submission) {
      return res.status(200).json({ success: true, data: submission });
    }
  } catch (error: any) {
    console.warn('MongoDB ticket lookup warning:', error.message);
  }

  if (sample) {
    return res.status(200).json({ success: true, data: sample });
  }

  return res.status(404).json({
    success: false,
    message: `Ticket ID ${ticketId} not found.`
  });
};

export const checkInAttendee = async (req: Request, res: Response) => {
  try {
    const { ticketId } = req.body;

    if (!ticketId) {
      return res.status(400).json({
        success: false,
        message: 'ticketId is required for check-in.'
      });
    }

    const targetTicket = (ticketId as string).trim().toUpperCase();
    let submission: any = null;
    try {
      submission = await SubmissionModel.findOne({ ticketId: targetTicket });
    } catch (err: any) {
      console.warn('MongoDB check-in lookup warning:', err.message);
    }

    if (submission) {
      if (submission.attendanceStatus === 'CHECKED_IN') {
        return res.status(200).json({
          success: true,
          alreadyCheckedIn: true,
          message: `Attendee ${submission.fullName} was ALREADY checked in at ${new Date(submission.checkedInAt || '').toLocaleTimeString()}`,
          data: submission
        });
      }

      submission.attendanceStatus = 'CHECKED_IN';
      submission.checkedInAt = new Date().toISOString();
      await submission.save();

      return res.status(200).json({
        success: true,
        alreadyCheckedIn: false,
        message: `SUCCESS! Check-in confirmed for ${submission.fullName}`,
        data: submission
      });
    }

    const sample = sampleSubmissions.find(s => s.ticketId.toUpperCase() === targetTicket);
    if (sample) {
      if (sample.attendanceStatus === 'CHECKED_IN') {
        return res.status(200).json({
          success: true,
          alreadyCheckedIn: true,
          message: `Attendee ${sample.fullName} was ALREADY checked in at ${new Date(sample.checkedInAt || '').toLocaleTimeString()}`,
          data: sample
        });
      }

      sample.attendanceStatus = 'CHECKED_IN';
      sample.checkedInAt = new Date().toISOString();

      return res.status(200).json({
        success: true,
        alreadyCheckedIn: false,
        message: `SUCCESS! Check-in confirmed for ${sample.fullName}`,
        data: sample
      });
    }

    return res.status(404).json({
      success: false,
      message: `Ticket ${ticketId} is invalid or not registered.`
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Check-in failed',
      error: error.message
    });
  }
};

export const acknowledgeSubmission = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    let sub: any = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      sub = await SubmissionModel.findById(id);
    }
    if (!sub) {
      sub = sampleSubmissions.find(s => s.id === id);
    }

    if (!sub) {
      return res.status(404).json({
        success: false,
        message: 'Submission record not found.'
      });
    }

    sub.acknowledged = true;
    sub.acknowledgedAt = new Date().toISOString();

    if (typeof sub.save === 'function') {
      await sub.save();
    }

    const domainTitle = sub.answers?.['Selected Domain'] || '';
    const themeTitle = sub.answers?.['Selected Theme'] || '';
    const submissionLink = sub.answers?.['Google Drive Video Reel Link'] || sub.answers?.['Google Drive Video Link'] || (sub.files && sub.files[0] ? (sub.files[0].driveLink || sub.files[0].localUrl) : '');

    const isNavroopam = Boolean(
      sub.eventId === '6aca70825588e8009b8e8e83' ||
      (typeof sub.eventId === 'string' && sub.eventId.toLowerCase().includes('nav')) ||
      sub.eventTitle?.toLowerCase()?.includes('navroopam') ||
      sub.eventTitle?.toLowerCase()?.includes('navaroopam')
    );

    const isPratidhwani = Boolean(
      sub.eventId === 'pratidhawni' ||
      sub.eventId === 'pratidhwani' ||
      sub.eventTitle?.toLowerCase()?.includes('pratid')
    );

    if (isNavroopam) {
      // Dispatch Navroopam Submission Received (Payment Under Verification) Email
      sendSubmissionReceivedEmail({
        toEmail: sub.email,
        toName: sub.fullName,
        ticketId: sub.ticketId,
        eventTitle: 'NAVROOPAM v7.0',
        eventDate: 'October 10 – 24, 2026',
        location: 'Online Submission Event (HITian Inside Portal)',
        phone: sub.phone || '',
        answers: sub.answers
      }).catch(err => console.error('Background Navroopam Acknowledgment Email Dispatch Error:', err));
    } else if (isPratidhwani) {
      sendPratidhwaniConfirmationEmail({
        toEmail: sub.email,
        toName: sub.fullName,
        ticketId: sub.ticketId,
        eventTitle: 'PRATIDHWANI',
        eventDate: 'August 15, 2026',
        location: 'Main Campus Grounds & SAC',
        phone: sub.phone || '',
        answers: sub.answers
      }).catch(err => console.error('Background Pratidhwani Confirmation Email Dispatch Error:', err));
    } else {
      // Dispatch Flagship Online Submission Acknowledgment Email (No QR, Online Event)
      sendSubmissionAcknowledgmentEmail({
        toEmail: sub.email,
        toName: sub.fullName,
        ticketId: sub.ticketId,
        eventTitle: sub.eventTitle,
        domainTitle,
        themeTitle,
        submissionLink,
        answers: sub.answers
      }).catch(err => console.error('Background Acknowledgment Email Dispatch Error:', err));
    }

    return res.status(200).json({
      success: true,
      message: `Acknowledgment email (submission & payment received) sent successfully to ${sub.fullName}!`,
      data: sub
    });
  } catch (err: any) {
    console.error('Acknowledge Submission Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to acknowledge submission',
      error: err.message
    });
  }
};

export const sendConfirmationEmail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { instagramPostUrl } = req.body;

    let sub: any = null;
    if (id.match(/^[0-9a-fA-F]{24}$/)) {
      sub = await SubmissionModel.findById(id);
    }
    if (!sub && id) {
      sub = await SubmissionModel.findOne({ ticketId: id.toUpperCase() });
    }
    if (!sub) {
      sub = sampleSubmissions.find(s => s.id === id || s.ticketId?.toUpperCase() === id.toUpperCase());
    }

    if (!sub) {
      return res.status(404).json({
        success: false,
        message: 'Submission record not found.'
      });
    }

    // Must be acknowledged first
    if (!sub.acknowledged) {
      return res.status(400).json({
        success: false,
        message: 'Acknowledgment email must be sent first before sending confirmation email.'
      });
    }

    const cleanInstagramUrl = (instagramPostUrl && typeof instagramPostUrl === 'string') 
      ? instagramPostUrl.trim() 
      : (sub.instagramPostUrl || '');

    const nowIso = new Date().toISOString();
    const newPaymentStatus = (sub.paymentStatus === 'PAID') ? 'PAID' : 'VERIFIED';
    const paymentVerifiedAt = sub.paymentVerifiedAt || nowIso;

    // Update in-memory / document object
    sub.instagramPostUrl = cleanInstagramUrl;
    sub.paymentStatus = newPaymentStatus;
    sub.paymentVerifiedAt = paymentVerifiedAt;
    sub.confirmationEmailSent = true;
    sub.confirmationEmailSentAt = nowIso;

    // Persist to MongoDB
    try {
      if (typeof sub.save === 'function') {
        await sub.save();
      } else {
        await SubmissionModel.findByIdAndUpdate(
          sub._id || sub.id,
          {
            $set: {
              instagramPostUrl: cleanInstagramUrl,
              paymentStatus: newPaymentStatus,
              paymentVerifiedAt: paymentVerifiedAt,
              confirmationEmailSent: true,
              confirmationEmailSentAt: nowIso
            }
          },
          { new: true }
        );
      }
    } catch (saveErr) {
      console.error('Error saving submission with instagramPostUrl:', saveErr);
    }

    // Dispatch Confirmation Email with Instagram link
    sendNavroopamConfirmationEmail({
      toEmail: sub.email,
      toName: sub.fullName,
      ticketId: sub.ticketId,
      eventTitle: sub.eventTitle || 'NAVROOPAM v7.0',
      eventDate: 'October 10 – 24, 2026',
      location: 'Online Submission Event (HITian Inside Portal)',
      phone: sub.phone || '',
      answers: sub.answers,
      instagramPostUrl: sub.instagramPostUrl || undefined
    }).catch(err => console.error('Background Confirmation Email Dispatch Error:', err));

    return res.status(200).json({
      success: true,
      message: `Payment verified & confirmation email with Instagram link sent successfully to ${sub.fullName}!`,
      data: sub
    });
  } catch (err: any) {
    console.error('Send Confirmation Email Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to send confirmation email',
      error: err.message
    });
  }
};

export const deleteSubmission = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    if (!id) {
      return res.status(400).json({ success: false, message: 'Submission ID is required' });
    }

    let deletedDoc: any = null;

    try {
      if (id.match(/^[0-9a-fA-F]{24}$/)) {
        deletedDoc = await SubmissionModel.findByIdAndDelete(id);
      }
      if (!deletedDoc) {
        deletedDoc = await SubmissionModel.findOneAndDelete({ ticketId: id.toUpperCase() });
      }
    } catch (dbErr) {}

    // Fallback: Delete from sampleSubmissions in memory
    const sampleIdx = sampleSubmissions.findIndex(s => s.id === id || s.ticketId.toUpperCase() === id.toUpperCase());
    if (sampleIdx !== -1) {
      sampleSubmissions.splice(sampleIdx, 1);
    }

    if (deletedDoc || sampleIdx !== -1) {
      return res.status(200).json({
        success: true,
        message: 'Submission deleted successfully'
      });
    }

    return res.status(404).json({
      success: false,
      message: 'Submission record not found'
    });
  } catch (error: any) {
    console.error('Delete Submission Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete submission',
      error: error.message
    });
  }
};

export const sendAppreciationEmailController = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { customMessage, location, timeSlot, dateStr } = req.body;

    let sub: any = null;
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      sub = await SubmissionModel.findById(id);
    }
    if (!sub && id) {
      sub = await SubmissionModel.findOne({ ticketId: id.toUpperCase() });
    }
    if (!sub && id) {
      sub = sampleSubmissions.find(s => s.id === id || s.ticketId.toUpperCase() === id.toUpperCase());
    }

    if (!sub) {
      return res.status(404).json({
        success: false,
        message: 'Participant / Submission record not found.'
      });
    }

    let certificateAttachment: { contentBase64: string; name: string } | undefined;
    let certificateUrl: string | undefined = sub.certificateFileUrl || undefined;

    // Process uploaded certificate file if provided
    const file = req.file || (req.files && Array.isArray(req.files) ? req.files[0] : undefined);
    
    // Strict requirement: A certificate must be provided either via new upload or stored URL
    if (!file && !sub.certificateFileUrl) {
      return res.status(400).json({
        success: false,
        message: 'Certificate is required. Please upload the participant\'s certificate before sending the appreciation email.'
      });
    }

    if (file) {
      certificateAttachment = {
        contentBase64: file.buffer.toString('base64'),
        name: file.originalname || `${sub.fullName.replace(/\s+/g, '_')}_Certificate.pdf`
      };

      try {
        // Attempt to upload to imagekit or cloudinary for web view link
        const uploadResult = await uploadImageToImageKit(
          file.buffer,
          `cert_${Date.now()}_${file.originalname || 'cert.pdf'}`,
          '/certificates'
        );
        if (uploadResult && uploadResult.url) {
          certificateUrl = uploadResult.url;
          sub.certificateFileUrl = uploadResult.url;
        }
      } catch (uploadErr) {
        console.warn('Could not store certificate in ImageKit (falling back to direct base64 attachment):', uploadErr);
      }
    }

    sub.appreciationSent = true;
    sub.appreciationSentAt = new Date().toISOString();

    if (typeof sub.save === 'function') {
      await sub.save();
    }

    // Fetch event metadata to include event banner if available
    let bannerUrl: string | undefined;
    try {
      let eventDoc: any = null;
      if (sub.eventId && sub.eventId.match(/^[0-9a-fA-F]{24}$/)) {
        eventDoc = await EventModel.findById(sub.eventId);
      }
      if (!eventDoc && sub.eventId) {
        eventDoc = await EventModel.findOne({ id: sub.eventId });
      }
      if (eventDoc && eventDoc.bannerUrl) {
        bannerUrl = eventDoc.bannerUrl;
      }
    } catch (e) {
      console.warn('Could not fetch event for banner URL:', e);
    }

    // Send the appreciation email with coupon collection details & attached certificate
    const emailSent = await sendParticipationAppreciationEmail({
      toEmail: sub.email,
      toName: sub.fullName,
      ticketId: sub.ticketId,
      eventTitle: sub.eventTitle,
      customMessage,
      location: location || 'Garden hut',
      timeSlot: timeSlot || '3:00 PM to 5:00 PM',
      dateStr: dateStr || '04. Oct 2026',
      certificateAttachment,
      certificateUrl,
      bannerUrl
    });

    return res.status(200).json({
      success: true,
      message: emailSent
        ? `Appreciation email sent successfully to ${sub.fullName} (${sub.email})!`
        : `Appreciation recorded, but email delivery was skipped or failed.`,
      data: sub
    });
  } catch (err: any) {
    console.error('Send Appreciation Email Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to send appreciation email',
      error: err.message
    });
  }
};

export const toggleCouponCollected = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { couponCollected } = req.body;

    let sub: any = null;
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      sub = await SubmissionModel.findById(id);
    }
    if (!sub && id) {
      sub = await SubmissionModel.findOne({ ticketId: id.toUpperCase() });
    }
    if (!sub && id) {
      sub = sampleSubmissions.find(s => s.id === id || s.ticketId.toUpperCase() === id.toUpperCase());
    }

    if (!sub) {
      return res.status(404).json({
        success: false,
        message: 'Participant record not found.'
      });
    }

    sub.couponCollected = typeof couponCollected === 'boolean' ? couponCollected : !sub.couponCollected;

    if (typeof sub.save === 'function') {
      await sub.save();
    }

    return res.status(200).json({
      success: true,
      message: `Coupon collection status updated for ${sub.fullName}`,
      data: sub
    });
  } catch (err: any) {
    console.error('Toggle Coupon Status Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update coupon status',
      error: err.message
    });
  }
};

export const deleteCertificateController = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    let sub: any = null;
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      sub = await SubmissionModel.findById(id);
    }
    if (!sub && id) {
      sub = await SubmissionModel.findOne({ ticketId: id.toUpperCase() });
    }
    if (!sub && id) {
      sub = sampleSubmissions.find(s => s.id === id || s.ticketId.toUpperCase() === id.toUpperCase());
    }

    if (!sub) {
      return res.status(404).json({
        success: false,
        message: 'Participant record not found.'
      });
    }

    sub.certificateFileUrl = null;

    if (typeof sub.save === 'function') {
      await sub.save();
    }

    return res.status(200).json({
      success: true,
      message: `Certificate removed for ${sub.fullName}`,
      data: sub
    });
  } catch (err: any) {
    console.error('Delete Certificate Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete certificate',
      error: err.message
    });
  }
};

export const updatePaymentStatus = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { paymentStatus } = req.body;

    if (!['PENDING', 'VERIFIED', 'REJECTED', 'PAID'].includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid paymentStatus. Allowed: PENDING, VERIFIED, REJECTED, PAID'
      });
    }

    let sub: any = null;
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      sub = await SubmissionModel.findById(id);
    }
    if (!sub && id) {
      sub = await SubmissionModel.findOne({ ticketId: id.toUpperCase() });
    }
    if (!sub && id) {
      sub = sampleSubmissions.find(s => s.id === id || s.ticketId.toUpperCase() === id.toUpperCase());
    }

    if (!sub) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    sub.paymentStatus = paymentStatus;
    if (paymentStatus === 'VERIFIED' || paymentStatus === 'PAID') {
      sub.paymentVerifiedAt = new Date().toISOString();

      // Automatically delete payment screenshot proof from Cloudinary / ImageKit / local storage upon verification
      if (Array.isArray(sub.files) && sub.files.length > 0) {
        const remainingFiles = [];
        for (const fileObj of sub.files) {
          const nameLower = (fileObj.originalName || '').toLowerCase();
          const isPaymentProof = nameLower.includes('proof') || 
                                 nameLower.includes('pay') || 
                                 nameLower.includes('screen') || 
                                 nameLower.includes('screenshot') || 
                                 nameLower.includes('utr') ||
                                 nameLower.includes('receipt') ||
                                 fileObj.provider === 'cloudinary_payment_proof' ||
                                 (sub.files.length > 1 && sub.files.indexOf(fileObj) === sub.files.length - 1);

          if (isPaymentProof) {
            console.log(`🧹 Payment verified! Cleaning up payment screenshot: ${fileObj.originalName} (${fileObj.provider})`);
            try {
              if (fileObj.provider === 'cloudinary' || (fileObj.localUrl && fileObj.localUrl.includes('cloudinary'))) {
                await deleteFromCloudinary(fileObj.fileId || fileObj.localUrl);
              } else if (fileObj.provider === 'imagekit' || (fileObj.localUrl && fileObj.localUrl.includes('imagekit'))) {
                await deleteFromImageKit(fileObj.fileId || fileObj.localUrl);
              }
            } catch (cleanupErr) {
              console.warn('Could not delete payment screenshot from cloud storage:', cleanupErr);
            }
          } else {
            remainingFiles.push(fileObj);
          }
        }
        sub.files = remainingFiles;
      }
    }

    if (typeof sub.save === 'function') {
      await sub.save();
    }

    return res.status(200).json({
      success: true,
      message: `Payment status updated to ${paymentStatus} for ${sub.fullName}${paymentStatus === 'VERIFIED' ? ' (Payment screenshot proof deleted from cloud storage)' : ''}`,
      data: sub
    });
  } catch (err: any) {
    console.error('Update Payment Status Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update payment status',
      error: err.message
    });
  }
};

export const updatePostingExcelDetails = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { postingStatus, instagramPostUrl, isDriveNotPublic, isDriveNotPublicReason } = req.body;

    let sub: any = null;
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      sub = await SubmissionModel.findById(id);
    }
    if (!sub && id) {
      sub = await SubmissionModel.findOne({ ticketId: id.toUpperCase() });
    }
    if (!sub && id) {
      sub = sampleSubmissions.find(s => s.id === id || s.ticketId.toUpperCase() === id.toUpperCase());
    }

    if (!sub) {
      return res.status(404).json({
        success: false,
        message: 'Submission not found'
      });
    }

    if (postingStatus !== undefined) {
      const validStatuses = ['QUALIFIED', 'POSTED', 'DISQUALIFIED', 'MAIL_SENT', null, ''];
      if (!validStatuses.includes(postingStatus)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid postingStatus. Allowed: QUALIFIED, POSTED, DISQUALIFIED, MAIL_SENT, or null'
        });
      }
      sub.postingStatus = postingStatus ? postingStatus : null;
    }

    if (instagramPostUrl !== undefined) {
      sub.instagramPostUrl = typeof instagramPostUrl === 'string' ? instagramPostUrl.trim() : null;
    }

    if (isDriveNotPublic !== undefined) {
      sub.isDriveNotPublic = Boolean(isDriveNotPublic);
    }

    if (isDriveNotPublicReason !== undefined) {
      sub.isDriveNotPublicReason = isDriveNotPublicReason ? String(isDriveNotPublicReason).trim() : null;
    }

    if (req.body.moveToPostingExcel !== undefined) {
      sub.moveToPostingExcel = Boolean(req.body.moveToPostingExcel);
    }

    if (typeof sub.save === 'function') {
      await sub.save();
    } else {
      await SubmissionModel.findByIdAndUpdate(
        sub._id || sub.id,
        {
          $set: {
            postingStatus: sub.postingStatus,
            instagramPostUrl: sub.instagramPostUrl,
            isDriveNotPublic: sub.isDriveNotPublic,
            isDriveNotPublicReason: sub.isDriveNotPublicReason,
            moveToPostingExcel: sub.moveToPostingExcel
          }
        },
        { new: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: `Posting details updated successfully for ${sub.fullName}`,
      data: sub
    });
  } catch (err: any) {
    console.error('Update Posting Details Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update posting excel details',
      error: err.message
    });
  }
};

/**
 * Send an email to the participant requesting them to make their Google Drive link public.
 * Generates a unique, one-time secure update token.
 */
export const requestDriveLinkUpdateEmail = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;

    let sub: any = null;
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      sub = await SubmissionModel.findById(id);
    }
    if (!sub && id) {
      sub = await SubmissionModel.findOne({ ticketId: id.toUpperCase() });
    }
    if (!sub && id) {
      sub = sampleSubmissions.find(s => s.id === id || s.ticketId.toUpperCase() === id.toUpperCase());
    }

    if (!sub) {
      return res.status(404).json({ success: false, message: 'Submission record not found' });
    }

    // Generate unique 32-char hex token for one-time update
    const token = crypto.randomBytes(24).toString('hex');
    const nowIso = new Date().toISOString();

    sub.driveLinkUpdateToken = token;
    sub.driveLinkUpdated = false; // Reset update status
    sub.driveUpdateMailSent = true;
    sub.driveUpdateMailSentAt = nowIso;
    sub.isDriveNotPublic = true;

    if (typeof sub.save === 'function') {
      await sub.save();
    } else {
      await SubmissionModel.findByIdAndUpdate(sub._id || sub.id, {
        $set: {
          driveLinkUpdateToken: token,
          driveLinkUpdated: false,
          driveUpdateMailSent: true,
          driveUpdateMailSentAt: nowIso,
          isDriveNotPublic: true
        }
      });
    }

    // Determine frontend domain dynamically from request, env, or production domain
    const frontendBase = getFrontendBaseUrl(req);
    // Construct the special route with UTM source and token
    const updateUrl = `${frontendBase}/submissions/update-drive-link?submissionId=${sub.id || sub._id}&ticketId=${encodeURIComponent(sub.ticketId)}&token=${token}&utm_source=email_drive_update&utm_medium=email&utm_campaign=gdrive_permission_fix`;

    // Send the email in background
    sendDriveLinkUpdateEmail({
      toEmail: sub.email,
      toName: sub.fullName,
      ticketId: sub.ticketId,
      eventTitle: sub.eventTitle || 'NAVROOPAM v7.0',
      domainTitle: sub.answers?.['Selected Domain'] || 'Puja Vlog',
      updateUrl
    }).catch(err => console.error('Error dispatching Drive Link Update Email:', err));

    return res.status(200).json({
      success: true,
      message: `Drive link update instructions sent to ${sub.fullName} (${sub.email}) successfully!`,
      updateUrl,
      data: sub
    });
  } catch (err: any) {
    console.error('Request Drive Link Update Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to send drive link update email',
      error: err.message
    });
  }
};

/**
 * Verify validity of the one-time drive link update page.
 * Checks utm_source, token match, and whether already updated (expired).
 */
export const getDriveLinkUpdateStatus = async (req: Request, res: Response) => {
  try {
    const { submissionId, ticketId, token, utm_source } = req.query;

    if (utm_source !== 'email_drive_update') {
      return res.status(403).json({
        success: false,
        errorCode: 'INVALID_SOURCE',
        message: 'Access Denied: This update portal can only be accessed directly from the official email link.'
      });
    }

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        errorCode: 'MISSING_TOKEN',
        message: 'Invalid or missing security token.'
      });
    }

    let sub: any = null;
    const subIdStr = typeof submissionId === 'string' ? submissionId : '';
    const ticketIdStr = typeof ticketId === 'string' ? ticketId : '';

    if (subIdStr && subIdStr.match(/^[0-9a-fA-F]{24}$/)) {
      sub = await SubmissionModel.findById(subIdStr);
    }
    if (!sub && ticketIdStr) {
      sub = await SubmissionModel.findOne({ ticketId: ticketIdStr.toUpperCase() });
    }
    if (!sub && subIdStr) {
      sub = sampleSubmissions.find(s => s.id === subIdStr || s.ticketId?.toUpperCase() === ticketIdStr.toUpperCase());
    }

    if (!sub) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Registration submission not found.'
      });
    }

    // Check token match
    if (sub.driveLinkUpdateToken !== token) {
      return res.status(403).json({
        success: false,
        errorCode: 'TOKEN_MISMATCH',
        message: 'Security token is invalid or has expired.'
      });
    }

    // Check one-time update expiration
    if (sub.driveLinkUpdated) {
      return res.status(410).json({
        success: false,
        errorCode: 'LINK_EXPIRED',
        message: 'This update link has already been used and is now expired. For competition integrity, submissions can only be updated once.',
        updatedAt: sub.driveLinkUpdatedAt
      });
    }

    // Return safe data for the frontend form
    const currentLink = sub.answers?.['Google Drive Video Reel Link'] || 
                        sub.answers?.['Google Drive Video Link'] || 
                        sub.answers?.['Drive Link'] || 
                        sub.files?.find((f: any) => f.driveLink)?.driveLink || '';

    return res.status(200).json({
      success: true,
      data: {
        ticketId: sub.ticketId,
        fullName: sub.fullName,
        email: sub.email,
        eventTitle: sub.eventTitle,
        domain: sub.answers?.['Selected Domain'] || 'Puja Vlog',
        theme: sub.answers?.['Selected Theme'] || '',
        currentLink
      }
    });
  } catch (err: any) {
    console.error('Get Drive Link Update Status Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify update link',
      error: err.message
    });
  }
};

/**
 * Execute the one-time update of the Google Drive link and invalidate the token.
 */
export const updateDriveLinkController = async (req: Request, res: Response) => {
  try {
    const { submissionId, ticketId, token, utm_source, newDriveLink } = req.body;

    if (utm_source !== 'email_drive_update') {
      return res.status(403).json({
        success: false,
        errorCode: 'INVALID_SOURCE',
        message: 'Access Denied: Submission allowed only via the verified email portal.'
      });
    }

    if (!newDriveLink || typeof newDriveLink !== 'string' || !newDriveLink.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid Google Drive link.'
      });
    }

    const cleanUrl = newDriveLink.trim();
    if (!cleanUrl.includes('drive.google.com') && !cleanUrl.includes('docs.google.com')) {
      return res.status(400).json({
        success: false,
        message: 'The link must be a valid Google Drive URL (e.g. https://drive.google.com/file/d/...)'
      });
    }

    let sub: any = null;
    if (submissionId && typeof submissionId === 'string' && submissionId.match(/^[0-9a-fA-F]{24}$/)) {
      sub = await SubmissionModel.findById(submissionId);
    }
    if (!sub && ticketId && typeof ticketId === 'string') {
      sub = await SubmissionModel.findOne({ ticketId: ticketId.toUpperCase() });
    }
    if (!sub && submissionId) {
      sub = sampleSubmissions.find(s => s.id === submissionId || s.ticketId?.toUpperCase() === (ticketId || '').toUpperCase());
    }

    if (!sub) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (sub.driveLinkUpdateToken !== token) {
      return res.status(403).json({
        success: false,
        errorCode: 'TOKEN_MISMATCH',
        message: 'Security token is invalid or has expired.'
      });
    }

    if (sub.driveLinkUpdated) {
      return res.status(410).json({
        success: false,
        errorCode: 'LINK_EXPIRED',
        message: 'This link has already been used and expired. You cannot update the link again.'
      });
    }

    const nowIso = new Date().toISOString();

    // Update answers dictionary
    if (!sub.answers) sub.answers = {};
    sub.answers['Google Drive Video Reel Link'] = cleanUrl;
    sub.answers['Google Drive Video Link'] = cleanUrl;
    sub.answers['Drive Link'] = cleanUrl;
    sub.answers['Drive Link Updated At'] = nowIso;

    // Also update in files array if exists
    if (Array.isArray(sub.files) && sub.files.length > 0) {
      const vidFile = sub.files.find((f: any) => f.provider === 'google_drive' || (f.mimeType && f.mimeType.includes('video')));
      if (vidFile) {
        vidFile.driveLink = cleanUrl;
        vidFile.downloadLink = cleanUrl;
      }
    }

    // Set updated flags & invalidate the one-time token immediately
    sub.driveLinkUpdated = true;
    sub.driveLinkUpdatedAt = nowIso;
    sub.isDriveNotPublic = false; // Resolved!
    sub.isDriveNotPublicReason = null;
    sub.driveLinkUpdateToken = null; // Token expires immediately!

    // Mark Mongoose mixed answers as modified
    if (typeof sub.markModified === 'function') {
      sub.markModified('answers');
      sub.markModified('files');
      await sub.save();
    } else {
      await SubmissionModel.findByIdAndUpdate(sub._id || sub.id, {
        $set: {
          answers: sub.answers,
          files: sub.files,
          driveLinkUpdated: true,
          driveLinkUpdatedAt: nowIso,
          isDriveNotPublic: false,
          isDriveNotPublicReason: null,
          driveLinkUpdateToken: null
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: `Your Google Drive link has been successfully updated and verified! Our judges can now evaluate your submission.`,
      data: {
        ticketId: sub.ticketId,
        updatedLink: cleanUrl,
        updatedAt: nowIso
      }
    });
  } catch (err: any) {
    console.error('Update Drive Link Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update Google Drive link',
      error: err.message
    });
  }
};

/**
 * Send an email to the participant requesting re-upload of their submission file (Photo, Artwork, Writing).
 * Rejection reasons include:
 * 1. Photo is not uploaded
 * 2. Against the rule you cannot upload collage
 * 3. You have submitted the payment ss instead of your photo (swapped position of submission and payment ss.)
 * Generates a unique, one-time secure token.
 */
export const requestResubmissionEmail = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required to notify the participant.'
      });
    }

    let sub: any = null;
    if (id && id.match(/^[0-9a-fA-F]{24}$/)) {
      sub = await SubmissionModel.findById(id);
    }
    if (!sub && id) {
      sub = await SubmissionModel.findOne({ ticketId: id.toUpperCase() });
    }
    if (!sub && id) {
      sub = sampleSubmissions.find(s => s.id === id || s.ticketId.toUpperCase() === id.toUpperCase());
    }

    if (!sub) {
      return res.status(404).json({ success: false, message: 'Submission record not found' });
    }

    // Generate unique 24-byte hex token for one-time re-upload
    const token = crypto.randomBytes(24).toString('hex');
    const nowIso = new Date().toISOString();

    sub.resubmissionToken = token;
    sub.resubmissionRequested = true;
    sub.resubmissionRequestedAt = nowIso;
    sub.resubmissionReason = rejectionReason.trim();
    sub.resubmissionCompleted = false;

    if (typeof sub.save === 'function') {
      await sub.save();
    } else {
      await SubmissionModel.findByIdAndUpdate(sub._id || sub.id, {
        $set: {
          resubmissionToken: token,
          resubmissionRequested: true,
          resubmissionRequestedAt: nowIso,
          resubmissionReason: rejectionReason.trim(),
          resubmissionCompleted: false
        }
      });
    }

    // Determine frontend domain dynamically from request, env, or production domain
    const frontendBase = getFrontendBaseUrl(req);
    // Construct the special route with UTM source and token
    const updateUrl = `${frontendBase}/submissions/reupload?submissionId=${sub.id || sub._id}&ticketId=${encodeURIComponent(sub.ticketId)}&token=${token}&utm_source=email_resubmission&utm_medium=email&utm_campaign=reupload_fix`;

    // Send the email in background
    sendResubmissionRequestEmail({
      toEmail: sub.email,
      toName: sub.fullName,
      ticketId: sub.ticketId,
      eventTitle: sub.eventTitle || 'NAVROOPAM v7.0',
      domainTitle: sub.answers?.['Selected Domain'] || 'Contest Domain',
      rejectionReason: rejectionReason.trim(),
      updateUrl
    }).catch(err => console.error('Error dispatching Resubmission Email:', err));

    return res.status(200).json({
      success: true,
      message: `Resubmission request email sent to ${sub.fullName} (${sub.email}) successfully!`,
      updateUrl,
      data: sub
    });
  } catch (err: any) {
    console.error('Request Resubmission Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to send resubmission email',
      error: err.message
    });
  }
};

/**
 * Verify validity of the one-time re-upload page.
 * Checks utm_source, token match, and whether already completed (expired).
 */
export const getResubmissionStatus = async (req: Request, res: Response) => {
  try {
    const { submissionId, ticketId, token, utm_source } = req.query;

    if (utm_source !== 'email_resubmission') {
      return res.status(403).json({
        success: false,
        errorCode: 'INVALID_SOURCE',
        message: 'Access Denied: This re-upload portal can only be accessed directly from the official email link.'
      });
    }

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        errorCode: 'MISSING_TOKEN',
        message: 'Invalid or missing security token.'
      });
    }

    let sub: any = null;
    const subIdStr = typeof submissionId === 'string' ? submissionId : '';
    const ticketIdStr = typeof ticketId === 'string' ? ticketId : '';

    if (subIdStr && subIdStr.match(/^[0-9a-fA-F]{24}$/)) {
      sub = await SubmissionModel.findById(subIdStr);
    }
    if (!sub && ticketIdStr) {
      sub = await SubmissionModel.findOne({ ticketId: ticketIdStr.toUpperCase() });
    }
    if (!sub && subIdStr) {
      sub = sampleSubmissions.find(s => s.id === subIdStr || s.ticketId?.toUpperCase() === ticketIdStr.toUpperCase());
    }

    if (!sub) {
      return res.status(404).json({
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Registration submission not found.'
      });
    }

    // Check token match
    if (sub.resubmissionToken !== token) {
      return res.status(403).json({
        success: false,
        errorCode: 'TOKEN_MISMATCH',
        message: 'Security token is invalid or has expired.'
      });
    }

    // Check one-time update expiration
    if (sub.resubmissionCompleted) {
      return res.status(410).json({
        success: false,
        errorCode: 'LINK_EXPIRED',
        message: 'This re-upload link has already been used and is now expired. For competition integrity, entries can only be updated once.',
        completedAt: sub.resubmissionCompletedAt
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        ticketId: sub.ticketId,
        fullName: sub.fullName,
        eventTitle: sub.eventTitle,
        domainTitle: sub.answers?.['Selected Domain'],
        rejectionReason: sub.resubmissionReason,
        resubmissionCompleted: Boolean(sub.resubmissionCompleted),
        resubmissionCompletedAt: sub.resubmissionCompletedAt
      }
    });
  } catch (err: any) {
    console.error('Verify Resubmission Status Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify re-upload token',
      error: err.message
    });
  }
};

/**
 * Handle re-uploading replacement file for a rejected submission.
 * Uploads file to CDN (Cloudinary / ImageKit), replaces the entry file,
 * sets resubmissionCompleted = true, and invalidates the token immediately.
 */
export const submitResubmissionFileController = async (req: Request, res: Response) => {
  try {
    const { submissionId, ticketId, token, utm_source } = req.body;

    if (utm_source !== 'email_resubmission') {
      return res.status(403).json({
        success: false,
        errorCode: 'INVALID_SOURCE',
        message: 'Access Denied: Re-upload must be submitted through the official email link.'
      });
    }

    if (!token || typeof token !== 'string') {
      return res.status(400).json({
        success: false,
        errorCode: 'MISSING_TOKEN',
        message: 'Invalid or missing security token.'
      });
    }

    if (!req.file && (!req.files || (Array.isArray(req.files) && req.files.length === 0))) {
      return res.status(400).json({
        success: false,
        message: 'Please select a replacement file to upload.'
      });
    }

    const uploadedFile: Express.Multer.File = req.file || (Array.isArray(req.files) ? req.files[0] : (Object.values(req.files || {})[0] as any)?.[0]);

    let sub: any = null;
    if (submissionId && typeof submissionId === 'string' && submissionId.match(/^[0-9a-fA-F]{24}$/)) {
      sub = await SubmissionModel.findById(submissionId);
    }
    if (!sub && ticketId && typeof ticketId === 'string') {
      sub = await SubmissionModel.findOne({ ticketId: ticketId.toUpperCase() });
    }
    if (!sub && submissionId) {
      sub = sampleSubmissions.find(s => s.id === submissionId || s.ticketId?.toUpperCase() === (ticketId || '').toUpperCase());
    }

    if (!sub) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    if (sub.resubmissionToken !== token) {
      return res.status(403).json({
        success: false,
        errorCode: 'TOKEN_MISMATCH',
        message: 'Security token is invalid or has expired.'
      });
    }

    if (sub.resubmissionCompleted) {
      return res.status(410).json({
        success: false,
        errorCode: 'LINK_EXPIRED',
        message: 'This link has already been used and expired. You cannot re-upload again.'
      });
    }

    // Upload file to CDN with robust fallback hierarchy (Cloudinary -> ImageKit -> Google Drive -> Base64 memory URI)
    const cleanEventFolder = (sub.eventTitle || 'hitian_events')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '') || 'hitian_events';

    let uploadedFileRecord: UploadedFile | null = null;
    const fileBuffer = uploadedFile.buffer;
    const origName = uploadedFile.originalname;

    // 1. If PDF document, try ImageKit first
    if (fileBuffer && uploadedFile.mimetype === 'application/pdf') {
      try {
        const ikRes = await uploadImageToImageKit(fileBuffer, origName, `/${cleanEventFolder}`);
        if (ikRes && ikRes.url) {
          uploadedFileRecord = {
            provider: 'imagekit',
            fileId: ikRes.fileId,
            driveLink: ikRes.url,
            downloadLink: ikRes.url,
            localUrl: ikRes.url,
            originalName: origName,
            mimeType: uploadedFile.mimetype,
            size: uploadedFile.size
          };
        }
      } catch (ikErr: any) {
        console.warn('ImageKit PDF upload failed, trying Cloudinary:', ikErr?.message || ikErr);
      }
    }

    // 2. Primary target for images / fallback for pdf: Cloudinary
    if (!uploadedFileRecord && fileBuffer) {
      try {
        const resourceType = uploadedFile.mimetype?.startsWith('image/') ? 'image' : 'auto';
        const cloudRes = await uploadToCloudinary(fileBuffer, origName, cleanEventFolder, resourceType);
        if (cloudRes && cloudRes.secureUrl) {
          uploadedFileRecord = {
            provider: 'cloudinary',
            fileId: cloudRes.publicId,
            driveLink: cloudRes.secureUrl,
            downloadLink: cloudRes.secureUrl,
            localUrl: cloudRes.secureUrl,
            originalName: origName,
            mimeType: uploadedFile.mimetype,
            size: cloudRes.bytes || uploadedFile.size
          };
        }
      } catch (cloudErr: any) {
        console.warn('Cloudinary replacement upload failed, attempting ImageKit fallback:', cloudErr?.message || cloudErr);
      }
    }

    // 3. Secondary target: ImageKit fallback
    if (!uploadedFileRecord && fileBuffer) {
      try {
        const ikRes = await uploadImageToImageKit(fileBuffer, origName, `/${cleanEventFolder}`);
        if (ikRes && ikRes.url) {
          uploadedFileRecord = {
            provider: 'imagekit',
            fileId: ikRes.fileId,
            driveLink: ikRes.url,
            downloadLink: ikRes.url,
            localUrl: ikRes.url,
            originalName: origName,
            mimeType: uploadedFile.mimetype,
            size: uploadedFile.size
          };
        }
      } catch (ikFallbackErr: any) {
        console.warn('ImageKit fallback failed, attempting Google Drive:', ikFallbackErr?.message || ikFallbackErr);
      }
    }

    // 4. Tertiary target: Google Drive
    if (!uploadedFileRecord) {
      try {
        const fileData = await uploadFileToDriveOrLocal(uploadedFile, req);
        if (fileData && (fileData.driveLink || fileData.localUrl)) {
          uploadedFileRecord = fileData;
        }
      } catch (driveErr: any) {
        console.warn('Google Drive fallback failed, falling back to base64 buffer:', driveErr?.message || driveErr);
      }
    }

    // 5. Ultimate Guarantee: Base64 data URI fallback (same standard as regular submission)
    if (!uploadedFileRecord && fileBuffer) {
      const base64Data = `data:${uploadedFile.mimetype};base64,${fileBuffer.toString('base64')}`;
      uploadedFileRecord = {
        provider: 'memory_fallback',
        fileId: `local_${Date.now()}`,
        driveLink: base64Data,
        downloadLink: base64Data,
        localUrl: base64Data,
        originalName: origName,
        mimeType: uploadedFile.mimetype,
        size: uploadedFile.size
      };
    }

    if (!uploadedFileRecord) {
      return res.status(500).json({
        success: false,
        message: 'Unable to process replacement file. Please check file format and try again.'
      });
    }

    // Preserve payment proof, replace submission file
    const currentFiles = Array.isArray(sub.files) ? sub.files : [];
    const paymentProof = currentFiles.find((f: any) => {
      const n = (f.originalName || '').toLowerCase();
      return n.includes('proof') || n.includes('pay') || n.includes('screen') || n.includes('utr') || f.provider === 'cloudinary_payment_proof';
    });

    const updatedFiles: UploadedFile[] = [];
    if (paymentProof) {
      updatedFiles.push(paymentProof);
    }
    updatedFiles.push(uploadedFileRecord);

    const nowIso = new Date().toISOString();
    sub.files = updatedFiles;
    sub.resubmissionCompleted = true;
    sub.resubmissionCompletedAt = nowIso;
    sub.resubmissionToken = null; // Token expires immediately!

    if (typeof sub.markModified === 'function') {
      sub.markModified('files');
      await sub.save();
    } else {
      await SubmissionModel.findByIdAndUpdate(sub._id || sub.id, {
        $set: {
          files: sub.files,
          resubmissionCompleted: true,
          resubmissionCompletedAt: nowIso,
          resubmissionToken: null
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Your replacement submission file has been successfully uploaded and locked! Our judges can now evaluate your entry.',
      data: {
        ticketId: sub.ticketId,
        fileName: origName,
        completedAt: nowIso,
        fileUrl: uploadedFileRecord.localUrl
      }
    });
  } catch (err: any) {
    console.error('Submit Resubmission File Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to submit replacement file',
      error: err.message
    });
  }
};


