import { Router } from 'express';
import { submitRegistration, getSubmissionByTicket, checkInAttendee } from '../controllers/submission.controller.js';
import { upload } from '../middlewares/upload.middleware.js';
const router = Router();
router.post('/', upload.single('file'), submitRegistration);
router.get('/ticket/:ticketId', getSubmissionByTicket);
router.post('/checkin', checkInAttendee);
export default router;
