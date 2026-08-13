import { Request, Response } from 'express';
import fs from 'fs';
import QRCode from 'qrcode';
import { uploadFileToDriveOrLocal } from '../services/googledrive.service.js';
import { uploadToCloudinary } from '../services/cloudinary.service.js';
import { EventModel } from '../models/event.model.js';
import { SubmissionModel, sampleSubmissions } from '../models/submission.model.js';
import { SubmissionItem, UploadedFile } from '../types/backend.types.js';
import { sendRegistrationConfirmationEmail, sendSubmissionAcknowledgmentEmail, sendPratidhwaniConfirmationEmail } from '../services/brevo.service.js';

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

    for (const uploadedFile of uploadedFilesList) {
      try {
        const fileBuffer = uploadedFile.buffer;

        // If uploaded file is an image (Artwork or Photograph), upload to Cloudinary using Buffer
        if (uploadedFile.mimetype.startsWith('image/') && fileBuffer) {
          const cloudRes = await uploadToCloudinary(fileBuffer, uploadedFile.originalname, 'swaraj_e_hind').catch(() => null);
          if (cloudRes) {
            files.push({
              provider: 'cloudinary',
              fileId: cloudRes.publicId,
              driveLink: cloudRes.secureUrl,
              downloadLink: cloudRes.secureUrl,
              localUrl: cloudRes.secureUrl,
              originalName: uploadedFile.originalname,
              mimeType: uploadedFile.mimetype,
              size: cloudRes.bytes
            });
            continue;
          }
        }

        // Upload to Google Drive using Buffer stream, or fallback to memory data URI
        const fileData = await uploadFileToDriveOrLocal(uploadedFile, req).catch(() => null);
        if (fileData) {
          files.push(fileData);
        } else {
          const base64Data = fileBuffer ? `data:${uploadedFile.mimetype};base64,${fileBuffer.toString('base64')}` : '';
          const fallbackUrl = base64Data || `https://via.placeholder.com/800x600.png?text=${encodeURIComponent(uploadedFile.originalname)}`;
          files.push({
            provider: 'memory_fallback',
            localUrl: fallbackUrl,
            driveLink: fallbackUrl,
            originalName: uploadedFile.originalname,
            mimeType: uploadedFile.mimetype,
            size: uploadedFile.size
          });
        }
      } catch (fileErr: any) {
        console.error('File Upload Buffer Processing Warning:', fileErr.message);
        const base64Data = uploadedFile.buffer ? `data:${uploadedFile.mimetype};base64,${uploadedFile.buffer.toString('base64')}` : '';
        const fallbackUrl = base64Data || `https://via.placeholder.com/800x600.png?text=${encodeURIComponent(uploadedFile.originalname)}`;
        files.push({
          provider: 'memory_fallback',
          localUrl: fallbackUrl,
          driveLink: fallbackUrl,
          originalName: uploadedFile.originalname,
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

    // Send Pratidhwani Confirmation Email (NOT Submission Acknowledgment Email) for Pratidhwani registrations
    const isPratidhwaniEvent = Boolean(
      eventId === 'pratidhawni' ||
      eventId === 'pratidhwani' ||
      eventTitle.toLowerCase().includes('pratid') ||
      parsedAnswers['Payment Status'] === 'PAID'
    );

    if (isPratidhwaniEvent) {
      sendPratidhwaniConfirmationEmail({
        toEmail: email,
        toName: fullName,
        ticketId,
        eventTitle: 'PRATIDHWANI',
        eventDate: 'August 15, 2026',
        location: 'Main Campus Grounds & SAC',
        phone: phone || '',
        answers: parsedAnswers,
        qrCodeUrl
      }).catch(err => console.error('Pratidhwani Confirmation Email Dispatch Error:', err));
    }

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
    const eventId = req.params.eventId as string;
    
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
    const submissionLink = sub.answers?.['Google Drive Video Reel Link'] || (sub.files && sub.files[0] ? (sub.files[0].driveLink || sub.files[0].localUrl) : '');

    // Dispatch Acknowledgment Email via Brevo
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

    return res.status(200).json({
      success: true,
      message: `Submission for ${sub.fullName} (${domainTitle || 'Entry'}) acknowledged! Acknowledgment email sent.`,
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


