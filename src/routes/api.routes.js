import express from 'express';
import { getEvents, getEventById, createEvent } from '../controllers/event.controller.js';
import { 
  submitRegistration, 
  getEventSubmissions, 
  getSubmissionByTicket, 
  checkInAttendee 
} from '../controllers/submission.controller.js';
import { verifyCertificate, issueCertificate } from '../controllers/certificate.controller.js';
import { adminLogin, verifyAdminToken } from '../controllers/admin.controller.js';
import { upload } from '../middleware/upload.middleware.js';

const router = express.Router();

// Health Check
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'Backend server is running smoothly',
    timestamp: new Date().toISOString()
  });
});

// Admin Auth
router.post('/admin/login', adminLogin);

// Event Endpoints (Admin creates events, public views events)
router.get('/events', getEvents);
router.get('/events/:id', getEventById);
router.post('/events', createEvent);

// Registration & File Submissions (Public)
router.post('/submissions', upload.single('file'), submitRegistration);
router.get('/submissions/ticket/:ticketId', getSubmissionByTicket);
router.post('/submissions/checkin', checkInAttendee);

// Certificate Verification (Public) & Issuance (Admin)
router.get('/certificates/verify/:certId', verifyCertificate);
router.post('/certificates/issue', issueCertificate);

// Admin View Submissions
router.get('/events/:eventId/submissions', getEventSubmissions);

export default router;
