// In-memory Certificates Data Store
export let certificates = [
  {
    certificateId: 'CERT-HIT-2026-X891',
    participantName: 'Alex Johnson',
    email: 'alex.johnson@hit.edu',
    eventTitle: 'HITian Tech Symposium 2026',
    issueDate: '2026-09-16',
    certificateType: 'Certificate of Excellence',
    issuer: 'HITian Inside Official',
    status: 'VALID'
  },
  {
    certificateId: 'CERT-HIT-2026-Y402',
    participantName: 'Sarah Smith',
    email: 'sarah.smith@hit.edu',
    eventTitle: 'Design-a-Thon UI/UX Contest',
    issueDate: '2026-10-03',
    certificateType: 'Certificate of Participation',
    issuer: 'HITian Inside Creative Wing',
    status: 'VALID'
  }
];

export const verifyCertificate = (req, res) => {
  try {
    const { certId } = req.params;

    if (!certId) {
      return res.status(400).json({
        success: false,
        message: 'Certificate ID is required for verification.'
      });
    }

    const cert = certificates.find(c => c.certificateId.toUpperCase() === certId.trim().toUpperCase());

    if (!cert) {
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
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error verifying certificate',
      error: error.message
    });
  }
};

export const issueCertificate = (req, res) => {
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

    const newCert = {
      certificateId,
      participantName,
      email: email || '',
      eventTitle,
      issueDate: new Date().toISOString().split('T')[0],
      certificateType: certificateType || 'Certificate of Participation',
      issuer: 'HITian Inside Official',
      status: 'VALID'
    };

    certificates.unshift(newCert);

    return res.status(201).json({
      success: true,
      message: 'Certificate issued successfully',
      data: newCert
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to issue certificate',
      error: error.message
    });
  }
};
