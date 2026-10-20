import { Router } from 'express';
import { adminRoutes } from '../modules/admin/index.js';
import { eventRoutes } from '../modules/event/index.js';
import { getEventSubmissions } from '../modules/submission/index.js';
import submissionRoutes from './submission.route.js';
import { certificateRoutes } from '../modules/certificate/index.js';
import { uploadRoutes } from '../modules/upload/index.js';
import { analyticsRoutes } from '../modules/analytics/index.js';
import { observerRoutes } from '../modules/observer/index.js';

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
router.use('/analytics', analyticsRoutes);
router.use('/observer', observerRoutes);

// Admin view event submissions route
router.get('/events/:eventId/submissions', getEventSubmissions);

export default router;
