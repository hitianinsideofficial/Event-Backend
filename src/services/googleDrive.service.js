import fs from 'fs';
import path from 'path';

/**
 * Service handler for file uploads.
 * If Google Drive API credentials are provided in .env, uploads to Google Drive.
 * Otherwise, provides local static URL serving fallback.
 */
export async function uploadFileToDriveOrLocal(file, req) {
  if (!file) return null;

  const localUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;

  // Check if Google Drive environment credentials exist
  const clientEmail = process.env.GOOGLE_DRIVE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_DRIVE_PRIVATE_KEY;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (clientEmail && privateKey && folderId) {
    try {
      // Lazy load googleapis if configured
      const { google } = await import('googleapis');
      const auth = new google.auth.JWT(
        clientEmail,
        null,
        privateKey.replace(/\\n/g, '\n'),
        ['https://www.googleapis.com/auth/drive.file']
      );

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
        resource: fileMetaData,
        media: media,
        fields: 'id, webViewLink, webContentLink',
      });

      return {
        provider: 'google_drive',
        fileId: response.data.id,
        driveLink: response.data.webViewLink,
        downloadLink: response.data.webContentLink,
        localUrl,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size
      };
    } catch (err) {
      console.error('Google Drive Upload Warning (Falling back to local storage):', err.message);
    }
  }

  // Local storage return
  return {
    provider: 'local',
    localUrl,
    driveLink: localUrl, // fallback link
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size
  };
}
