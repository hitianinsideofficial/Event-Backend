import { Request, Response } from 'express';
import { SubmissionModel, sampleSubmissions } from '../../models/submission.model.js';
import { EventModel } from '../../models/event.model.js';
import { sendParticipationAppreciationEmail } from '../email/index.js';
import { uploadImageToImageKit } from '../../services/imagekit.service.js';

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
