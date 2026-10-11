import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  bytes: number;
}

export async function uploadToCloudinary(
  fileBuffer: Buffer,
  fileName: string,
  folder = "swaraj_e_hind",
  resourceType: "auto" | "image" | "raw" = "auto"
): Promise<CloudinaryUploadResult | null> {
  try {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } =
      process.env;

    if (
      !CLOUDINARY_CLOUD_NAME ||
      !CLOUDINARY_API_KEY ||
      !CLOUDINARY_API_SECRET
    ) {
      console.error("❌ Cloudinary environment variables are missing.");
      return null;
    }

    const cleanPublicId = `${Date.now()}_${fileName.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/\.[^/.]+$/, "")}`;

    const result = await new Promise<any>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          public_id: cleanPublicId,
        },
        (error: any, result: any) => {
          if (error) {
            reject(error);
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(fileBuffer);
    });

    return {
      url: result.url,
      secureUrl: result.secure_url,
      publicId: result.public_id,
      format: result.format,
      bytes: result.bytes,
    };
  } catch (error) {
    console.error("❌ Cloudinary upload failed:", error);
    return null;
  }
}

export async function deleteFromCloudinary(publicIdOrUrl: string): Promise<boolean> {
  try {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      console.error("❌ Cloudinary environment variables are missing.");
      return false;
    }

    let publicId = publicIdOrUrl;
    if (publicIdOrUrl.includes('cloudinary.com') || publicIdOrUrl.includes('res.cloudinary.com')) {
      // Extract public_id from URL: e.g. https://res.cloudinary.com/demo/image/upload/v12345/swaraj_e_hind/proof_123.png -> swaraj_e_hind/proof_123
      const parts = publicIdOrUrl.split('/upload/');
      if (parts.length > 1) {
        const afterUpload = parts[1];
        // Remove version if present (e.g. v12345678/)
        const withoutVersion = afterUpload.replace(/^v\d+\//, '');
        // Remove file extension
        publicId = withoutVersion.replace(/\.[^/.]+$/, '');
      }
    }

    console.log(`🗑️ Deleting file from Cloudinary with publicId: ${publicId}`);
    const res = await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
    console.log(`🗑️ Cloudinary destroy result:`, res);
    return res.result === 'ok' || res.result === 'not found';
  } catch (error) {
    console.error("❌ Cloudinary delete failed:", error);
    return false;
  }
}