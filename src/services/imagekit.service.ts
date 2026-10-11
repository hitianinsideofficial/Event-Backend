import ImageKit from 'imagekit';
import dotenv from 'dotenv';
dotenv.config();

const publicKey = process.env.IMAGEKIT_PUBLIC_KEY || '';
const privateKey = process.env.IMAGEKIT_PRIVATE_KEY || '';
const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT || 'https://ik.imagekit.io/hitianinside';

export const imagekit = new ImageKit({
  publicKey,
  privateKey,
  urlEndpoint
});

export async function uploadImageToImageKit(
  fileBuffer: Buffer,
  fileName: string,
  folder: string = '/event-banners'
): Promise<{ url: string; fileId: string }> {
  try {
    const response = await imagekit.upload({
      file: fileBuffer,
      fileName,
      folder
    });

    return {
      url: response.url,
      fileId: response.fileId
    };
  } catch (err: any) {
    console.error('ImageKit upload error:', err);
    throw new Error(`ImageKit Upload Failed: ${err.message || err}`);
  }
}

export async function deleteFromImageKit(fileIdOrUrl: string): Promise<boolean> {
  try {
    let fileId = fileIdOrUrl;
    if (fileIdOrUrl.startsWith('http')) {
      // Look up fileId using file name if needed, or if fileId is stored
      const fileName = fileIdOrUrl.split('/').pop()?.split('?')[0] || '';
      if (fileName) {
        const list = await imagekit.listFiles({ searchQuery: `name="${fileName}"` });
        if (list && list.length > 0 && (list[0] as any).fileId) {
          fileId = (list[0] as any).fileId;
        }
      }
    }

    if (fileId && !fileId.startsWith('http')) {
      console.log(`🗑️ Deleting file from ImageKit with fileId: ${fileId}`);
      await imagekit.deleteFile(fileId);
      return true;
    }
    return false;
  } catch (err: any) {
    console.error('ImageKit delete error:', err);
    return false;
  }
}
