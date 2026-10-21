import { Request, Response } from 'express';
import { SubmissionModel, sampleSubmissions } from '../../models/submission.model.js';
import { deleteFromCloudinary, uploadToCloudinary } from '../../services/cloudinary.service.js';
import { deleteFromImageKit, uploadImageToImageKit } from '../../services/imagekit.service.js';

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
      // If Instagram link is provided and status was not changed or was default QUALIFIED, automatically mark POSTED
      if (sub.instagramPostUrl && (!postingStatus || postingStatus === 'QUALIFIED')) {
        sub.postingStatus = 'POSTED';
      }
    }

    if (isDriveNotPublic !== undefined) {
      sub.isDriveNotPublic = Boolean(isDriveNotPublic);
    }

    if (isDriveNotPublicReason !== undefined) {
      sub.isDriveNotPublicReason = isDriveNotPublicReason ? String(isDriveNotPublicReason).trim() : null;
    }

    if (req.body.moveToPostingExcel !== undefined) {
      sub.moveToPostingExcel = Boolean(req.body.moveToPostingExcel);
      // When someone is added to posting excel, by default make them QUALIFIED ('Yellow') if they do not already have a status
      if (sub.moveToPostingExcel && !sub.postingStatus) {
        sub.postingStatus = 'QUALIFIED';
      }
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

export const updateSubmissionMedia = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { mediaLink } = req.body;

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

    const nowIso = new Date().toISOString();
    if (!sub.answers) sub.answers = {};

    // 1. If an uploaded replacement file is provided
    if (req.file) {
      const uploadedFile = req.file;
      const fileBuffer = uploadedFile.buffer;
      const origName = uploadedFile.originalname;

      let newFileObj: any = null;

      // Try ImageKit or Cloudinary
      if (fileBuffer) {
        try {
          if (uploadedFile.mimetype.startsWith('image/')) {
            const cloudRes = await uploadToCloudinary(fileBuffer, origName, 'submissions', 'image');
            if (cloudRes && cloudRes.secureUrl) {
              newFileObj = {
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
          }
          
          if (!newFileObj) {
            const ikRes = await uploadImageToImageKit(fileBuffer, origName, '/submissions');
            if (ikRes && ikRes.url) {
              newFileObj = {
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
          }
        } catch (uploadErr) {
          console.warn('Cloud upload failed, falling back to base64 memory uri:', uploadErr);
        }
      }

      if (!newFileObj) {
        const base64Data = fileBuffer ? `data:${uploadedFile.mimetype};base64,${fileBuffer.toString('base64')}` : '';
        newFileObj = {
          provider: 'memory_fallback',
          localUrl: base64Data,
          driveLink: base64Data,
          originalName: origName,
          mimeType: uploadedFile.mimetype,
          size: uploadedFile.size
        };
      }

      // Keep payment proof if present, replace main entry media file
      const currentFiles = Array.isArray(sub.files) ? sub.files : [];
      const paymentProof = currentFiles.find((f: any) => {
        const n = (f.originalName || '').toLowerCase();
        return n.includes('proof') || n.includes('pay') || n.includes('screen') || n.includes('utr') || f.provider === 'cloudinary_payment_proof';
      });

      sub.files = paymentProof ? [newFileObj, paymentProof] : [newFileObj];
      sub.answers['Google Drive Video Reel Link'] = newFileObj.driveLink || newFileObj.localUrl;
      sub.answers['Google Drive Video Link'] = newFileObj.driveLink || newFileObj.localUrl;
      sub.answers['Media File Replaced At'] = nowIso;
    } 
    // 2. If a media URL / Drive link was provided
    else if (mediaLink && typeof mediaLink === 'string') {
      const cleanUrl = mediaLink.trim();
      sub.answers['Google Drive Video Reel Link'] = cleanUrl;
      sub.answers['Google Drive Video Link'] = cleanUrl;
      sub.answers['Drive Link'] = cleanUrl;
      sub.answers['Drive Link Updated At'] = nowIso;
      sub.isDriveNotPublic = false;

      // Update in files array if exists, or add
      if (Array.isArray(sub.files) && sub.files.length > 0) {
        const vidFile = sub.files.find((f: any) => f.provider === 'google_drive' || (f.mimeType && f.mimeType.includes('video')) || !f.originalName?.includes('proof'));
        if (vidFile) {
          vidFile.driveLink = cleanUrl;
          vidFile.localUrl = cleanUrl;
          vidFile.provider = 'google_drive';
        } else {
          sub.files.unshift({
            provider: 'google_drive',
            localUrl: cleanUrl,
            driveLink: cleanUrl,
            originalName: 'Google Drive Submission Link',
            mimeType: 'video/mp4',
            size: 0
          });
        }
      } else {
        sub.files = [{
          provider: 'google_drive',
          localUrl: cleanUrl,
          driveLink: cleanUrl,
          originalName: 'Google Drive Submission Link',
          mimeType: 'video/mp4',
          size: 0
        }];
      }
    } else {
      return res.status(400).json({
        success: false,
        message: 'Please provide either a replacement file or a mediaLink URL.'
      });
    }

    if (typeof sub.save === 'function') {
      await sub.save();
    } else {
      await SubmissionModel.findByIdAndUpdate(
        sub._id || sub.id,
        {
          $set: {
            files: sub.files,
            answers: sub.answers,
            isDriveNotPublic: sub.isDriveNotPublic
          }
        },
        { new: true }
      );
    }

    return res.status(200).json({
      success: true,
      message: `Media successfully updated for ${sub.fullName}!`,
      data: sub
    });
  } catch (err: any) {
    console.error('Update Submission Media Error:', err);
    return res.status(500).json({
      success: false,
      message: 'Failed to update submission media',
      error: err.message
    });
  }
};
