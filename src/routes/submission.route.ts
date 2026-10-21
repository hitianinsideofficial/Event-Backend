import { Router } from 'express';
import { 
  submitRegistration, 
  getSubmissionByTicket, 
  getEventSubmissions,
  checkInAttendee, 
  acknowledgeSubmission,
  sendConfirmationEmail,
  deleteSubmission,
  sendAppreciationEmailController,
  toggleCouponCollected,
  deleteCertificateController,
  updatePaymentStatus,
  updatePostingExcelDetails,
  updateSubmissionMedia,
  requestDriveLinkUpdateEmail,
  getDriveLinkUpdateStatus,
  updateDriveLinkController,
  requestResubmissionEmail,
  getResubmissionStatus,
  submitResubmissionFileController
} from '../controllers/submission.controller.js';
import { upload } from '../middlewares/upload.middleware.js';
import { verifyAdminToken } from '../middlewares/auth.middleware.js';

const router = Router();

// Public drive link update verification and submission
router.get('/drive-update/verify', getDriveLinkUpdateStatus);
router.post('/drive-update/submit', updateDriveLinkController);

// Public resubmission (photo/artwork/doc) verification and upload
router.get('/resubmission/verify', getResubmissionStatus);
router.post('/resubmission/submit', upload.any(), submitResubmissionFileController);

router.get('/', getEventSubmissions);
router.get('/all', getEventSubmissions);
router.post('/', upload.any(), submitRegistration);
router.get('/ticket/:ticketId', getSubmissionByTicket);
router.post('/checkin', checkInAttendee);
router.post('/:id/acknowledge', acknowledgeSubmission);
router.post('/:id/confirmation-email', sendConfirmationEmail);
router.post('/:id/appreciation-email', upload.single('certificate'), sendAppreciationEmailController);
router.delete('/:id/certificate', deleteCertificateController);
router.patch('/:id/coupon-status', toggleCouponCollected);
router.patch('/:id/payment-status', verifyAdminToken, updatePaymentStatus);
router.patch('/:id/posting-excel', verifyAdminToken, updatePostingExcelDetails);
router.put('/:id/media', verifyAdminToken, upload.single('mediaFile'), updateSubmissionMedia);
router.post('/:id/request-drive-update', verifyAdminToken, requestDriveLinkUpdateEmail);
router.post('/:id/request-resubmission', verifyAdminToken, requestResubmissionEmail);
router.delete('/:id', verifyAdminToken, deleteSubmission);

export default router;


