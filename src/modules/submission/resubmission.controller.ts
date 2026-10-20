import { Request, Response } from 'express';
import crypto from 'crypto';
import { SubmissionModel, sampleSubmissions } from '../../models/submission.model.js';
import { UploadedFile } from '../../types/backend.types.js';
import { sendResubmissionRequestEmail } from '../email/index.js';
import { uploadToCloudinary } from '../../services/cloudinary.service.js';
import { uploadImageToImageKit } from '../../services/imagekit.service.js';
import { uploadFileToDriveOrLocal } from '../../services/googledrive.service.js';
import { getFrontendBaseUrl } from './submission.helper.js';

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
