import { Router } from 'express';
import { 
  submitRegistration, 
  getSubmissionByTicket, 
  checkInAttendee, 
  acknowledgeSubmission,
  deleteSubmission 
} from '../controllers/submission.controller.js';
import { upload } from '../middlewares/upload.middleware.js';
import { verifyAdminToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/', upload.any(), submitRegistration);
router.get('/ticket/:ticketId', getSubmissionByTicket);
router.post('/checkin', checkInAttendee);
router.post('/:id/acknowledge', acknowledgeSubmission);
router.delete('/:id', verifyAdminToken, deleteSubmission);

export default router;
