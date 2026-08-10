import { Router } from 'express';
import { 
  trackPageView, 
  trackClick, 
  getAnalyticsSummary 
} from '../controllers/analytics.controller.js';

const router = Router();

// Public Tracking Endpoints
router.post('/pageview', trackPageView);
router.post('/click', trackClick);

// Admin Dashboard Summary Endpoint
router.get('/dashboard', getAnalyticsSummary);

export default router;
