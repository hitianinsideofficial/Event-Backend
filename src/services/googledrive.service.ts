import fs from 'fs';
import { Readable } from 'stream';
import { Request } from 'express';
import { UploadedFile } from '../types/backend.types.js';

export async function uploadFileToDriveOrLocal(file: Express.Multer.File, req: Request): Promise<UploadedFile | null> {
  if (!file) return null;

  // Generate a data URI fallback for memory storage if disk writing is read-only
  const base64Data = file.buffer ? `data:${file.mimetype};base64,${file.buffer.toString('base64')}` : '';
  const fallbackUrl = base64Data || `https://via.placeholder.com/800x600.png?text=${encodeURIComponent(file.originalname)}`;

  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (clientEmail && privateKey && folderId) {
    try {
      const { google } = await import('googleapis');
      const auth = new google.auth.JWT({
        email: clientEmail,
        key: privateKey.replace(/\\n/g, '\n'),
        scopes: ['https://www.googleapis.com/auth/drive']
      });

      const drive = google.drive({ version: 'v3', auth });

      const fileMetaData = {
        name: file.originalname,
        parents: [folderId],
      };

      const mediaBody = file.buffer
        ? Readable.from(file.buffer)
        : (file.path && fs.existsSync(file.path) ? fs.createReadStream(file.path) : undefined);

      if (!mediaBody) {
        throw new Error('No valid file buffer or stream available.');
      }

      const response = await drive.files.create({
        requestBody: fileMetaData,
        media: {
          mimeType: file.mimetype,
          body: mediaBody,
        },
        fields: 'id, webViewLink, webContentLink',
      });

      // Grant anyone read access so links can be previewed/downloaded directly in admin
      if (response.data.id) {
        await drive.permissions.create({
          fileId: response.data.id,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        }).catch((permErr) => console.warn('Could not set public permission on Drive file:', permErr.message));
      }

      return {
        provider: 'google_drive',
        fileId: response.data.id || undefined,
        driveLink: response.data.webViewLink || undefined,
        downloadLink: response.data.webContentLink || undefined,
        localUrl: response.data.webViewLink || fallbackUrl,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size
      };
    } catch (err: any) {
      console.error('Google Drive Upload Warning (Falling back to memory data URI):', err.message);
    }
  }

  return {
    provider: 'memory_fallback',
    localUrl: fallbackUrl,
    driveLink: fallbackUrl,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  };
}
