import { Request, Response } from 'express';
import fs from 'fs';
import QRCode from 'qrcode';
import { uploadFileToDriveOrLocal } from '../services/googledrive.service.js';
import { uploadToCloudinary, deleteFromCloudinary } from '../services/cloudinary.service.js';
import { EventModel } from '../models/event.model.js';
import { SubmissionModel, sampleSubmissions } from '../models/submission.model.js';
import { SubmissionItem, UploadedFile } from '../types/backend.types.js';
import { sendRegistrationConfirmationEmail, sendSubmissionAcknowledgmentEmail, sendPratidhwaniConfirmationEmail, sendNavroopamConfirmationEmail, sendParticipationAppreciationEmail } from '../services/brevo.service.js';
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

export const submitRegistration = async (req: Request, res: Response) => {
  try {
    const { eventId, fullName, email, phone, answers } = req.body;

    if (!eventId || !fullName || !email || !phone) {
      return res.status(400).json({
        success: false,
        message: 'eventId, fullName, email, and Mobile Phone Number are required.'
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
            message: `You have ALREADY submitted an entry for ${selectedDomain} (Roll: ${collegeRoll}). Each domain allows only 1 submission.`
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
            message: `You have ALREADY submitted an entry for ${selectedDomain} (Roll: ${collegeRoll}). Each domain allows only 1 submission.`
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
    console.error('Submission Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to process registration',
      error: error.message
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
      // Dispatch Navroopam Online Confirmation Email without QR code
      sendNavroopamConfirmationEmail({
        toEmail: sub.email,
        toName: sub.fullName,
        ticketId: sub.ticketId,
        eventTitle: 'NAVROOPAM v7.0',
        eventDate: 'October 15 – 24, 2026',
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
      message: `Payment & submission verified for ${sub.fullName} (${domainTitle || 'Entry'}). Acknowledgment email sent successfully!`,
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
