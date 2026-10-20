import { Request, Response } from 'express';
import QRCode from 'qrcode';
import { EventModel } from '../../models/event.model.js';
import { SubmissionModel, sampleSubmissions } from '../../models/submission.model.js';
import { SubmissionItem, UploadedFile } from '../../types/backend.types.js';
import { uploadFileToDriveOrLocal } from '../../services/googledrive.service.js';
import { uploadToCloudinary } from '../../services/cloudinary.service.js';
import { uploadImageToImageKit } from '../../services/imagekit.service.js';
import { normalizeRollString } from './submission.helper.js';

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

    // Determine event folder name for Cloudinary (e.g., 'navroopam', 'swaraj_e_hind', or clean title)
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
