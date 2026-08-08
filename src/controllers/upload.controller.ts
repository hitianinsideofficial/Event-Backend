import { Request, Response } from 'express';
import { uploadImageToImageKit } from '../services/imagekit.service.js';

export const uploadToImageKitHandler = async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file provided for upload.'
      });
    }

    const { url, fileId } = await uploadImageToImageKit(
      req.file.buffer,
      req.file.originalname,
      '/hitian-inside-events'
    );

    return res.status(200).json({
      success: true,
      message: 'Image uploaded successfully to ImageKit CDN!',
      data: {
        url,
        fileId,
        originalName: req.file.originalname
      }
    });
  } catch (error: any) {
    console.error('Upload to ImageKit handler error:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'ImageKit Upload Failed'
    });
  }
};
