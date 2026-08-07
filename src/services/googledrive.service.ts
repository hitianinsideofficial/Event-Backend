import fs from 'fs';
import { Request } from 'express';
import { UploadedFile } from '../types/backend.types.js';

export async function uploadFileToDriveOrLocal(file: Express.Multer.File, req: Request): Promise<UploadedFile | null> {
  if (!file) return null;

  const localUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;

  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (clientEmail && privateKey && folderId) {
    try {
      const { google } = await import('googleapis');
      const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/drive.file']
      });

      const drive = google.drive({ version: 'v3', auth });

      const fileMetaData = {
        name: file.originalname,
        parents: [folderId],
      };

      const media = {
        mimeType: file.mimetype,
        body: fs.createReadStream(file.path),
      };

      const response = await drive.files.create({
        requestBody: fileMetaData,
        media: media,
        fields: 'id, webViewLink, webContentLink',
      });

      return {
        provider: 'google_drive',
        fileId: response.data.id || undefined,
        driveLink: response.data.webViewLink || undefined,
        downloadLink: response.data.webContentLink || undefined,
        localUrl,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size
      };
    } catch (err: any) {
      console.error('Google Drive Upload Warning (Falling back to local storage):', err.message);
    }
  }

  return {
    provider: 'local',
    localUrl,
    driveLink: localUrl,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  };
}
