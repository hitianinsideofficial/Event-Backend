import { Request, Response } from 'express';
import { SubmissionModel } from '../../models/submission.model.js';
import { sendNavroopamCertificateEmail } from '../email/index.js';

export const sendCertificateEmailController = async (req: Request, res: Response) => {
  try {
    const { submissionId, email, fullName, ticketId, eventTitle, domains, certificateBase64 } = req.body;

    const targetEmail = (email || '').trim().toLowerCase();
    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email is required.'
      });
    }

    if (!certificateBase64) {
      return res.status(400).json({
        success: false,
        message: 'Rendered certificate base64 content is required.'
      });
    }

    // Clean base64 header if present (e.g. data:image/jpeg;base64,...)
    const cleanBase64 = certificateBase64.replace(/^data:image\/\w+;base64,/, '');

    const safeName = (fullName || 'Participant').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
    const attachmentName = `Navroopam_Certificate_${safeName}.jpg`;

    const dispatched = await sendNavroopamCertificateEmail({
      toEmail: targetEmail,
      toName: fullName || 'Participant',
      ticketId: ticketId || '',
      eventTitle: eventTitle || 'NAVROOPAM v7.0',
      domains: Array.isArray(domains) ? domains : [],
      certificateAttachment: {
        contentBase64: cleanBase64,
        name: attachmentName
      }
    });

    if (!dispatched) {
      return res.status(500).json({
        success: false,
        message: `Failed to dispatch certificate email to ${targetEmail} via Brevo.`
      });
    }

    // Update all submissions belonging to this student with certificateSent = true
    try {
      const now = new Date().toISOString();
      const escapedEmail = targetEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      await SubmissionModel.updateMany(
        {
          $or: [
            { email: { $regex: new RegExp(`^${escapedEmail}$`, 'i') } },
            ...(submissionId ? [{ _id: submissionId }] : [])
          ]
        },
        {
          $set: {
            certificateSent: true,
            certificateSentAt: now
          }
        }
      );
    } catch (dbErr: any) {
      console.warn('MongoDB submission certificate update warning:', dbErr.message);
    }

    return res.status(200).json({
      success: true,
      message: `Certificate email successfully sent to ${targetEmail}!`
    });
  } catch (error: any) {
    console.error('Send Certificate Email Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while sending certificate email.',
      error: error.message
    });
  }
};
