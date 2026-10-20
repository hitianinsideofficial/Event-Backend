import { Request, Response } from 'express';
import { SubmissionModel, sampleSubmissions } from '../../models/submission.model.js';
import { deleteFromCloudinary } from '../../services/cloudinary.service.js';
import { deleteFromImageKit } from '../../services/imagekit.service.js';

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
