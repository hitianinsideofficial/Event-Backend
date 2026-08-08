import dotenv from 'dotenv';
import crypto from 'crypto';
import FormData from 'form-data';
import fetch from 'node-fetch';
dotenv.config();
export async function uploadToCloudinary(fileBuffer, fileName, folder = 'swaraj_e_hind') {
    let cloudName = process.env.CLOUDINARY_CLOUD_NAME || '';
    let apiKey = process.env.CLOUDINARY_API_KEY || '';
    let apiSecret = process.env.CLOUDINARY_API_SECRET || '';
    // Fallback parsing from CLOUDINARY_URL if present
    if ((!cloudName || !apiKey || !apiSecret) && process.env.CLOUDINARY_URL) {
        try {
            const match = process.env.CLOUDINARY_URL.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
            if (match) {
                apiKey = match[1];
                apiSecret = match[2];
                cloudName = match[3];
            }
        }
        catch (e) { }
    }
    if (!cloudName || !apiKey || !apiSecret) {
        console.warn('⚠️ Cloudinary credentials missing in environment variables.');
        return null;
    }
    try {
        const timestamp = Math.floor(Date.now() / 1000);
        const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
        const signature = crypto.createHash('sha1').update(paramsToSign).digest('hex');
        const form = new FormData();
        form.append('file', fileBuffer, { filename: fileName });
        form.append('api_key', apiKey);
        form.append('timestamp', timestamp.toString());
        form.append('folder', folder);
        form.append('signature', signature);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
            method: 'POST',
            body: form
        });
        if (res.ok) {
            const data = await res.json();
            console.log(`☁️ Cloudinary Upload Success: ${data.secure_url}`);
            return {
                url: data.url,
                secureUrl: data.secure_url,
                publicId: data.public_id,
                format: data.format,
                bytes: data.bytes
            };
        }
        else {
            const errText = await res.text();
            console.error('❌ Cloudinary Upload API Error:', errText);
            return null;
        }
    }
    catch (err) {
        console.error('❌ Cloudinary Upload Exception:', err.message);
        return null;
    }
}
