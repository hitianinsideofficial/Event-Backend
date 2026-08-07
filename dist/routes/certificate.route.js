import { Router } from 'express';
import { verifyCertificate, issueCertificate } from '../controllers/certificate.controller.js';
const router = Router();
router.get('/verify/:certId', verifyCertificate);
router.post('/issue', issueCertificate);
export default router;
