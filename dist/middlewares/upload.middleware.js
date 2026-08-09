import multer from 'multer';

// Use memoryStorage to avoid EROFS read-only filesystem errors on Vercel Serverless environment
const storage = multer.memoryStorage();
const fileFilter = (req, file, cb) => {
    // Allow all standard image, document, video, and archive mime types
    if (file.mimetype.startsWith('image/') ||
        file.mimetype.startsWith('video/') ||
        file.mimetype.startsWith('text/') ||
        file.mimetype.includes('pdf') ||
        file.mimetype.includes('word') ||
        file.mimetype.includes('document') ||
        file.mimetype.includes('msword') ||
        file.mimetype.includes('zip') ||
        file.mimetype.includes('octet-stream') ||
        file.originalname.match(/\.(jpg|jpeg|png|webp|gif|psd|ai|tiff|pdf|doc|docx|mp4|mov|zip|rar)$/i)) {
        cb(null, true);
    }
    else {
        cb(null, true); // Fallback allow under size limit
    }
};
export const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 100 * 1024 * 1024 } // 100 MB max limit
});

