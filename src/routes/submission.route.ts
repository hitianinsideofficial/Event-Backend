import { Router } from 'express';
import { 
  submitRegistration, 
  getSubmissionByTicket, 
  checkInAttendee, 
  acknowledgeSubmission,
  deleteSubmission,
  sendAppreciationEmailController,
  toggleCouponCollected,
  deleteCertificateController
} from '../controllers/submission.controller.js';
import { upload } from '../middlewares/upload.middleware.js';
import { verifyAdminToken } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/', upload.any(), submitRegistration);
router.get('/ticket/:ticketId', getSubmissionByTicket);
router.post('/checkin', checkInAttendee);
router.post('/:id/acknowledge', acknowledgeSubmission);
router.post('/:id/appreciation-email', upload.single('certificate'), sendAppreciationEmailController);
router.delete('/:id/certificate', deleteCertificateController);
router.patch('/:id/coupon-status', toggleCouponCollected);
router.delete('/:id', verifyAdminToken, deleteSubmission);

export default router;


