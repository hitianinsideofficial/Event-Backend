import { Router } from 'express';
import { observerLogin } from '../controllers/observer.controller.js';
import { getEventSubmissions } from '../controllers/submission.controller.js';
import { verifyObserverToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Public Observer Login
router.post('/login', observerLogin);

// Observer Authenticated Read-Only Submissions View
router.get('/submissions', verifyObserverToken, getEventSubmissions);
router.get('/events/:eventId/submissions', verifyObserverToken, getEventSubmissions);

export default router;
