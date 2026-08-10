import { Router } from 'express';
import { adminLogin } from '../controllers/admin.controller.js';
import { 
  getObservers, 
  createObserver, 
  toggleObserverStatus, 
  deleteObserver 
} from '../controllers/observer.controller.js';
import { getLogsAndAnalytics } from '../controllers/log.controller.js';
import { verifyAdminToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/login', adminLogin);

// Admin Observer Credentials Management
router.get('/observers', verifyAdminToken, getObservers);
router.post('/observers', verifyAdminToken, createObserver);
router.patch('/observers/:id/status', verifyAdminToken, toggleObserverStatus);
router.delete('/observers/:id', verifyAdminToken, deleteObserver);

// System Audit Logs & Submission Analytics
router.get('/logs-analytics', verifyAdminToken, getLogsAndAnalytics);

export default router;
