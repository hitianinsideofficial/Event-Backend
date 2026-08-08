import { Router } from 'express';
import multer from 'multer';
import { uploadToImageKitHandler } from '../controllers/upload.controller.js';
const router = Router();
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 25 * 1024 * 1024 } // 25MB
});
// POST /api/upload/imagekit
router.post('/imagekit', upload.single('image'), uploadToImageKitHandler);
export default router;
