import { Router } from 'express';
import eventRoutes from './event.route.js';
import submissionRoutes from './submission.route.js';
import certificateRoutes from './certificate.route.js';
import adminRoutes from './admin.route.js';
import uploadRoutes from './upload.route.js';
import { getEventSubmissions } from '../controllers/submission.controller.js';

const router = Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Backend server is running smoothly in TypeScript',
    timestamp: new Date().toISOString()
  });
});

router.use('/admin', adminRoutes);
router.use('/events', eventRoutes);
router.use('/submissions', submissionRoutes);
router.use('/certificates', certificateRoutes);
router.use('/upload', uploadRoutes);

// Admin view event submissions route
router.get('/events/:eventId/submissions', getEventSubmissions);

export default router;
