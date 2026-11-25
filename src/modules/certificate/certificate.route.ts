import { Router } from 'express';
import { 
  verifyCertificate, 
  issueCertificate, 
  checkParticipantCertificateEligibility 
} from './certificate.controller.js';
import { sendCertificateEmailController } from './certificate-email.controller.js';

const router = Router();

router.get('/verify/:certId', verifyCertificate);
router.post('/issue', issueCertificate);
router.get('/participant-eligibility', checkParticipantCertificateEligibility);
router.post('/participant-eligibility', checkParticipantCertificateEligibility);
router.post('/send-email', sendCertificateEmailController);

export default router;
