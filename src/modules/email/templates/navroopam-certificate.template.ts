import { dispatchEmail } from '../email-dispatcher.service.js';

export interface SendNavroopamCertificateEmailParams {
  toEmail: string;
  toName: string;
  ticketId?: string;
  eventTitle?: string;
  domains?: string[];
  certificateAttachment?: {
    contentBase64: string;
    name: string;
  };
}

export async function sendNavroopamCertificateEmail(
  params: SendNavroopamCertificateEmailParams
): Promise<boolean> {
  const {
    toEmail,
    toName,
    ticketId,
    eventTitle = 'NAVROOPAM v7.0',
    domains = [],
    certificateAttachment
  } = params;

  const maroonPrimary = '#800020';
  const maroonDark = '#4a0013';
  const goldAccent = '#e6c594';

  const domainsHtml = domains.length > 0
    ? `<div style="margin: 16px 0; padding: 12px 16px; background: #fffdf9; border: 1px solid #e6c594; border-radius: 8px;">
        <span style="font-size: 11px; text-transform: uppercase; color: #800020; font-weight: bold; letter-spacing: 0.5px;">Domain(s) Participated:</span>
        <ul style="margin: 6px 0 0 0; padding-left: 20px; font-size: 13px; color: #374151;">
          ${domains.map(d => `<li style="margin-bottom: 4px; font-weight: 600;">${d}</li>`).join('')}
        </ul>
      </div>`
    : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Certificate of Participation - ${eventTitle}</title>
      <style>
        body { margin: 0; padding: 0; background-color: #f8f6f4; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; -webkit-font-smoothing: antialiased; }
        .wrapper { width: 100%; background-color: #f8f6f4; padding: 36px 12px; }
        .main-card { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 6px 24px rgba(128, 0, 32, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04); border: 1px solid #ebdcd5; }
        .header { background: linear-gradient(135deg, ${maroonDark} 0%, #1f0309 50%, ${maroonPrimary} 100%); border-bottom: 2px solid ${goldAccent}; padding: 34px 28px 28px; text-align: center; }
        .header-title { font-size: 24px; font-weight: 800; color: #ffffff; margin: 12px 0 6px; letter-spacing: 0.5px; }
        .body-box { padding: 32px 30px 24px; }
        .cert-badge { display: inline-block; background: #ecfdf5; border: 1px solid #a7f3d0; color: #065f46; font-size: 11px; font-weight: bold; text-transform: uppercase; padding: 4px 12px; border-radius: 20px; margin-bottom: 16px; }
        .footer { background: #fdfbf7; border-top: 1px solid #ebdcd5; padding: 22px 28px; text-align: center; font-size: 11px; color: #887467; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="main-card">
          <div class="header">
            <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #e6c594; font-weight: 700;">HITian Inside &bull; Socio-Cultural Unit</div>
            <div class="header-title">${eventTitle}</div>
            <div style="color: #f0e4d6; font-size: 13px; font-weight: 500;">Durga Puja Online Socio-Cultural Mega Festival</div>
          </div>
          
          <div class="body-box">
            <div class="cert-badge">Official E-Certificate Issued &bull; Verified</div>
            <h2 style="font-size: 18px; font-weight: 700; color: #111827; margin: 0 0 14px;">Dear ${toName},</h2>
            
            <p style="font-size: 14.5px; line-height: 1.6; color: #1f2937; margin: 0 0 12px; font-weight: 600;">
              Congratulations on successfully participating in the event!
            </p>

            <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0 0 16px;">
              Team HITian Inside appreciates your enthusiasm, creativity, and efforts. We hope you enjoyed being a part of the event and look forward to seeing you participate in many more such events.
            </p>

            <p style="font-size: 14px; line-height: 1.6; color: #4b5563; margin: 0 0 16px;">
              Please find your participation certificate attached. Keep shining!
            </p>

            ${domainsHtml}

            <div style="background: #fff8f5; border-left: 4px solid #800020; padding: 14px 16px; margin: 20px 0; font-size: 13px; line-height: 1.5; color: #4b5563;">
              <strong style="color: #800020;">Please Note Regarding Awards:</strong><br/>
              This is your official online Certificate of Participation. As announced, the <strong>1st, 2nd, and 3rd rank position certificates and awards for each domain</strong> are being conferred offline.
            </div>

            <div style="text-align: center; margin: 28px 0 12px;">
              <p style="font-size: 13px; color: #6b7280; margin-bottom: 16px;">
                Your high-resolution certificate is attached directly to this email. You can also view or download it anytime from the event portal:
              </p>
              <a href="https://hitianinside.in/certificate" style="display: inline-block; background: #800020; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 14px; padding: 12px 28px; border-radius: 8px; border: 1px solid #e6c594; box-shadow: 0 2px 8px rgba(128, 0, 32, 0.25);">
                Download Certificate on Web Portal &rarr;
              </a>
            </div>

            ${ticketId ? `<p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 18px; font-family: monospace;">Registration Pass ID: ${ticketId}</p>` : ''}
          </div>

          <div class="footer">
            <p style="margin: 0 0 6px;">&copy; 2026 HITian Inside &bull; Haldia Institute of Technology</p>
            <p style="margin: 0; color: #a69181;">A Unit of Tabloid, Media and Literary Club</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  const attachments: Array<{ filename: string; content?: any }> = [];
  if (certificateAttachment && certificateAttachment.contentBase64) {
    attachments.push({
      filename: certificateAttachment.name || `Navroopam_Certificate_${toName.replace(/\s+/g, '_')}.jpg`,
      content: certificateAttachment.contentBase64
    });
  }

  return dispatchEmail({
    toEmail,
    toName,
    subject: `🎓 Your Certificate of Participation – ${eventTitle} | HITian Inside`,
    htmlContent,
    attachments: attachments.length > 0 ? attachments : undefined
  });
}
