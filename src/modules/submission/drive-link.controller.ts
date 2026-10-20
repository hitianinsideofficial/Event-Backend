import { Request, Response } from 'express';
import crypto from 'crypto';
import { SubmissionModel, sampleSubmissions } from '../../models/submission.model.js';
import { sendDriveLinkUpdateEmail } from '../email/index.js';
import { getFrontendBaseUrl } from './submission.helper.js';

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
