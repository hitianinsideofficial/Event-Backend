import { Request, Response } from 'express';
import { CertificateModel, sampleCertificates } from '../../models/certificate.model.js';
import { SubmissionModel } from '../../models/submission.model.js';
import { CertificateItem } from '../../types/backend.types.js';

export const verifyCertificate = async (req: Request, res: Response) => {
  try {
    const certId = (req.params.certId as string).trim().toUpperCase();

    if (!certId) {
      return res.status(400).json({
        success: false,
        message: 'Certificate ID is required for verification.'
      });
    }

    let cert: any = null;
    try {
      cert = await CertificateModel.findOne({ certificateId: certId });
    } catch (dbErr: any) {
      console.warn('MongoDB certificate lookup warning:', dbErr.message);
    }

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

/**
 * Public participant lookup for certificate download:
 * User enters their Ticket/Event-Pass ID or exact email submitted during registration.
 * Checks for valid participation (not disqualified).
 * Returns participant details and all domains participated (combined into single certificate).
 */
export const checkParticipantCertificateEligibility = async (req: Request, res: Response) => {
  try {
    const query = ((req.query.query || req.body.query || '') as string).trim();

    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Please provide your Event Pass ID or Registered Email address.'
      });
    }

    const isEmail = query.includes('@');
    let matchingSubs: any[] = [];

    // Search in MongoDB
    try {
      if (isEmail) {
        // Exact match case-insensitive
        const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        matchingSubs = await SubmissionModel.find({
          email: { $regex: new RegExp(`^${escaped}$`, 'i') }
        }).lean();
      } else {
        // Event Pass / Ticket ID match
        const cleanTicket = query.toUpperCase();
        matchingSubs = await SubmissionModel.find({
          ticketId: cleanTicket
        }).lean();

        // If found by ticketId, retrieve all submissions belonging to this same student's email
        // so that multi-domain participants get a single unified certificate
        if (matchingSubs.length > 0 && matchingSubs[0].email) {
          const participantEmail = matchingSubs[0].email;
          const escaped = participantEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          matchingSubs = await SubmissionModel.find({
            email: { $regex: new RegExp(`^${escaped}$`, 'i') }
          }).lean();
        }
      }
    } catch (dbErr: any) {
      console.warn('MongoDB submission search warning:', dbErr.message);
    }

    if (!matchingSubs || matchingSubs.length === 0) {
      return res.status(404).json({
        success: false,
        eligible: false,
        message: 'No valid participation detected for this Pass ID or Email. Please check your spelling or registration pass.'
      });
    }

    // Filter out completely disqualified or rejected entries if all entries are disqualified
    const validSubs = matchingSubs.filter(
      s => s.postingStatus !== 'DISQUALIFIED' && s.paymentStatus !== 'REJECTED'
    );

    if (validSubs.length === 0) {
      return res.status(403).json({
        success: false,
        eligible: false,
        message: 'No valid participation detected. The submission associated with this entry was disqualified or rejected.'
      });
    }

    // Extract consolidated domains
    const domainSet = new Set<string>();
    const ticketIds: string[] = [];

    for (const sub of validSubs) {
      if (sub.ticketId && !ticketIds.includes(sub.ticketId)) {
        ticketIds.push(sub.ticketId);
      }
      const dom = sub.answers?.['Selected Domain'] || sub.answers?.['Domain'] || 'General Entry';
      if (dom) {
        domainSet.add(dom.toString().trim());
      }
    }

    const domains = Array.from(domainSet);
    const primarySub = validSubs[0];

    return res.status(200).json({
      success: true,
      eligible: true,
      participant: {
        fullName: primarySub.fullName,
        email: primarySub.email,
        ticketId: primarySub.ticketId,
        allTicketIds: ticketIds,
        eventTitle: primarySub.eventTitle || 'NAVROOPAM v7.0',
        domains: domains,
        domainCount: domains.length,
        totalEntries: validSubs.length,
        certificateType: 'Certificate of Participation',
        certificateUrl: '/Navroopam-certificate.jpeg'
      }
    });
  } catch (error: any) {
    console.error('Participant certificate eligibility check error:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while checking certificate eligibility.',
      error: error.message
    });
  }
};
