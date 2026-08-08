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
