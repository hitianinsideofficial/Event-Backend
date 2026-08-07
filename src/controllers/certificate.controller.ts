import { Request, Response } from 'express';
import { CertificateModel, sampleCertificates } from '../models/certificate.model.js';
import { CertificateItem } from '../types/backend.types.js';

export const verifyCertificate = async (req: Request, res: Response) => {
  try {
    const certId = (req.params.certId as string).trim().toUpperCase();

    if (!certId) {
      return res.status(400).json({
        success: false,
        message: 'Certificate ID is required for verification.'
      });
    }

    let cert = await CertificateModel.findOne({ certificateId: certId });

    if (!cert) {
      const sample = sampleCertificates.find(c => c.certificateId.toUpperCase() === certId);
      if (sample) {
        return res.status(200).json({
          success: true,
          verified: true,
          message: 'Certificate Verified Authentic ✓',
          data: sample
        });
      }

      return res.status(404).json({
        success: false,
        message: `Certificate ID "${certId}" could not be verified or does not exist.`
      });
    }

    return res.status(200).json({
      success: true,
      verified: true,
      message: 'Certificate Verified Authentic ✓',
      data: cert
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Error verifying certificate',
      error: error.message
    });
  }
};

export const issueCertificate = async (req: Request, res: Response) => {
  try {
    const { participantName, email, eventTitle, certificateType } = req.body;

    if (!participantName || !eventTitle) {
      return res.status(400).json({
        success: false,
        message: 'participantName and eventTitle are required.'
      });
    }

    const certHex = Math.random().toString(36).substring(2, 6).toUpperCase();
    const certificateId = `CERT-HIT-2026-${certHex}`;

    try {
      const newDoc = await CertificateModel.create({
        certificateId,
        participantName,
        email: email || '',
        eventTitle,
        issueDate: new Date().toISOString().split('T')[0],
        certificateType: certificateType || 'Certificate of Participation',
        issuer: 'HITian Inside Official',
        status: 'VALID'
      });

      return res.status(201).json({
        success: true,
        message: 'Certificate issued and saved to MongoDB Atlas!',
        data: newDoc
      });
    } catch (dbErr) {
      const newCert: CertificateItem = {
        certificateId,
        participantName,
        email: email || '',
        eventTitle,
        issueDate: new Date().toISOString().split('T')[0],
        certificateType: certificateType || 'Certificate of Participation',
        issuer: 'HITian Inside Official',
        status: 'VALID'
      };
      sampleCertificates.unshift(newCert);

      return res.status(201).json({
        success: true,
        message: 'Certificate issued successfully',
        data: newCert
      });
    }
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: 'Failed to issue certificate',
      error: error.message
    });
  }
};
