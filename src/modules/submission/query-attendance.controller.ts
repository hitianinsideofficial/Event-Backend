import { Request, Response } from 'express';
import { SubmissionModel, sampleSubmissions } from '../../models/submission.model.js';
import {
  sendNavroopamConfirmationEmail,
  sendSubmissionAcknowledgmentEmail,
  sendSubmissionReceivedEmail
} from '../email/index.js';

export const getEventSubmissions = async (req: Request, res: Response) => {
  try {
    const eventId = (req.params.eventId || req.query.eventId) as string;
    
    let filter: any = {};
    if (eventId && eventId !== 'all') {
      filter.eventId = eventId;
    }

    const subs = await SubmissionModel.find(filter).sort({ createdAt: -1 }).lean();

    if (subs && subs.length > 0) {
      // Clean up any historical base64 fallback strings that bloat payload to 25MB+
      const sanitizedSubs = subs.map((sub: any) => {
        if (sub._id) {
          sub.id = sub._id.toString();
          delete sub._id;
        }
        delete sub.__v;
        if (Array.isArray(sub.files)) {
          sub.files = sub.files.map((f: any) => {
            const cleanF = { ...f };
            if (cleanF.localUrl && cleanF.localUrl.startsWith('data:')) {
              cleanF.localUrl = '';
            }
            if (cleanF.driveLink && cleanF.driveLink.startsWith('data:')) {
              cleanF.driveLink = '';
            }
            if (cleanF.downloadLink && cleanF.downloadLink.startsWith('data:')) {
              cleanF.downloadLink = '';
            }
            return cleanF;
          });
        }
        return sub;
      });

      return res.status(200).json({
        success: true,
        count: sanitizedSubs.length,
        data: sanitizedSubs
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

    let quotaInfo: any = null;
    try {
      const { getBrevoAccountQuota } = await import('../email/index.js');
      quotaInfo = await getBrevoAccountQuota();
    } catch (e) {
      // quota check is non-blocking
    }

    const remaining = quotaInfo?.credits;
    const isLowCredits = typeof remaining === 'number' && remaining < 10;
    const quotaWarning = isLowCredits
      ? `⚠️ WARNING: Only ${remaining} Brevo emails remaining for today out of 300 limit! Quota resets at 00:00 UTC (Midnight).`
      : undefined;

    return res.status(200).json({
      success: true,
      message: `Acknowledgment email (submission & payment received) sent successfully to ${sub.fullName}!`,
      data: sub,
      quota: quotaInfo ? {
        credits: quotaInfo.credits,
        totalLimit: quotaInfo.totalLimit,
        used: quotaInfo.used,
        warningAlert: isLowCredits,
        alertMessage: quotaWarning
      } : undefined
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
          { returnDocument: 'after' }
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

    let quotaInfo: any = null;
    try {
      const { getBrevoAccountQuota } = await import('../email/index.js');
      quotaInfo = await getBrevoAccountQuota();
    } catch (e) {
      // quota check is non-blocking
    }

    const remaining = quotaInfo?.credits;
    const isLowCredits = typeof remaining === 'number' && remaining < 10;
    const quotaWarning = isLowCredits
      ? `⚠️ WARNING: Only ${remaining} Brevo emails remaining for today out of 300 limit! Quota resets at 00:00 UTC (Midnight).`
      : undefined;

    return res.status(200).json({
      success: true,
      message: `Payment verified & confirmation email with Instagram link sent successfully to ${sub.fullName}!`,
      data: sub,
      quota: quotaInfo ? {
        credits: quotaInfo.credits,
        totalLimit: quotaInfo.totalLimit,
        used: quotaInfo.used,
        warningAlert: isLowCredits,
        alertMessage: quotaWarning
      } : undefined
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
