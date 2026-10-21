import { dispatchEmail } from '../email-dispatcher.service.js';

export interface SendAppreciationEmailParams {
  toEmail: string;
  toName: string;
  ticketId?: string;
  eventTitle: string;
  customMessage?: string;
  location?: string;
  timeSlot?: string;
  dateStr?: string;
  certificateAttachment?: {
    contentBase64: string; // Base64 encoded content of the file
    name: string;
  };
  certificateUrl?: string;
  bannerUrl?: string;
}

export async function sendParticipationAppreciationEmail(params: SendAppreciationEmailParams): Promise<boolean> {
  const {
    toEmail,
    toName,
    eventTitle,
    customMessage,
    location = 'Garden hut',
    timeSlot = '3:00 PM – 5:00 PM',
    dateStr = '04. Oct 2026',
    certificateAttachment,
    certificateUrl,
    bannerUrl
  } = params;

  const defaultMsg = `We sincerely appreciate your active participation, enthusiasm, and dedication in <strong>${eventTitle}</strong>. Your energy and effort contributed greatly to making this event a grand success!`;
  const messageBody = customMessage ? customMessage.replace(/\n/g, '<br/>') : defaultMsg;

  // Theme Colors: Maroon Palette
  const maroonPrimary = '#800020';
  const maroonDark = '#4a0013';
  const goldAccent = '#e6c594';

  const headerStyle = bannerUrl 
    ? `background: linear-gradient(180deg, rgba(42, 6, 14, 0.82) 0%, rgba(26, 4, 8, 0.94) 100%), url('${bannerUrl}') center/cover no-repeat; border-bottom: 2px solid ${maroonPrimary};`
    : `background: linear-gradient(135deg, ${maroonDark} 0%, #1f0309 50%, ${maroonPrimary} 100%); border-bottom: 2px solid ${goldAccent};`;

  const brandPillStyle = `background: rgba(230, 197, 148, 0.15); border: 1px solid rgba(230, 197, 148, 0.4); color: ${goldAccent};`;
  const headerTitleColor = `#ffffff`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Certificate of Participation - ${eventTitle}</title>
      <style>
        body {
          margin: 0;
          padding: 0;
          background-color: #f8f6f4;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          color: #1f2937;
          -webkit-font-smoothing: antialiased;
        }
        .wrapper {
          width: 100%;
          background-color: #f8f6f4;
          padding: 36px 12px;
        }
        .main-card {
          max-width: 580px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 6px 24px rgba(128, 0, 32, 0.08), 0 1px 4px rgba(0, 0, 0, 0.04);
          border: 1px solid #ebdcd5;
        }
        .header {
          ${headerStyle}
          padding: 38px 28px;
          text-align: center;
          color: #ffffff;
        }
        .brand-pill {
          display: inline-block;
          ${brandPillStyle}
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1.2px;
          padding: 5px 16px;
          border-radius: 9999px;
          margin-bottom: 12px;
        }
        .header-title {
          margin: 0;
          font-size: 26px;
          font-weight: 900;
          color: ${headerTitleColor};
          letter-spacing: -0.3px;
          text-shadow: 0 2px 10px rgba(0,0,0,0.6);
        }
        .header-sub {
          margin: 6px 0 0 0;
          font-size: 13px;
          color: #f2e2cf;
        }
        .content {
          padding: 32px 28px 24px 28px;
        }
        .greeting {
          font-size: 18px;
          font-weight: 700;
          color: #111827;
          margin: 0 0 14px 0;
        }
        .message-text {
          font-size: 14px;
          line-height: 1.65;
          color: #4b5563;
          margin: 0 0 24px 0;
        }
        .coupon-box {
          background: #fff8f8;
          border: 1.5px solid #f2d6dc;
          border-left: 4px solid #800020;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }
        .coupon-heading {
          font-size: 14px;
          font-weight: 700;
          color: #800020;
          margin: 0 0 12px 0;
          display: flex;
          align-items: center;
        }
        .info-table {
          width: 100%;
          border-collapse: collapse;
        }
        .info-table td {
          padding: 6px 0;
          font-size: 13px;
          vertical-align: middle;
        }
        .info-label {
          color: #715858;
          font-weight: 500;
          width: 38%;
        }
        .info-value {
          color: #1c0509;
          font-weight: 600;
        }
        .cert-card {
          background: linear-gradient(135deg, #fdf8f4 0%, #faede8 100%);
          border: 1px solid #ebd1c8;
          border-radius: 12px;
          padding: 20px;
          text-align: center;
          margin-bottom: 12px;
        }
        .cert-card h4 {
          margin: 0 0 6px 0;
          font-size: 15px;
          font-weight: 700;
          color: #800020;
        }
        .cert-card p {
          margin: 0 0 14px 0;
          font-size: 13px;
          color: #5c1827;
        }
        .btn-view {
          display: inline-block;
          background: #800020;
          color: #ffffff !important;
          text-decoration: none;
          font-size: 13px;
          font-weight: 700;
          padding: 10px 22px;
          border-radius: 8px;
          box-shadow: 0 3px 8px rgba(128, 0, 32, 0.25);
        }
        .footer {
          background: #fdfbf9;
          border-top: 1px solid #f0e6e2;
          padding: 24px 28px;
          text-align: center;
          font-size: 12px;
          color: #786b67;
        }
        .footer a {
          color: #800020;
          text-decoration: none;
          font-weight: 600;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="main-card">
          <!-- Header with Maroon / Banner Theme -->
          <div class="header">
            <div class="brand-pill">
              HITian Inside • Official
            </div>
            <h1 class="header-title">${eventTitle}</h1>
            <p class="header-sub">Participation & Appreciation Notification</p>
          </div>

          <!-- Body -->
          <div class="content">
            <h2 class="greeting">Dear ${toName},</h2>
            <div class="message-text">
              ${messageBody}
            </div>

            <!-- Coupon Collection Notice -->
            <div class="coupon-box">
              <div class="coupon-heading">
                Participation Coupon Collection Details
              </div>
              <table class="info-table">
                <tr>
                  <td class="info-label">Venue / Counter:</td>
                  <td class="info-value">${location}</td>
                </tr>
                <tr>
                  <td class="info-label">Collection Date:</td>
                  <td class="info-value">${dateStr}</td>
                </tr>
                <tr>
                  <td class="info-label">Timing:</td>
                  <td class="info-value">${timeSlot}</td>
                </tr>
              </table>
            </div>

            <!-- Certificate Attachment Box -->
            <div class="cert-card">
              <h4>Certificate of Participation</h4>
              <p>
                ${certificateAttachment ? 'Your official Certificate has been verified and attached directly to this email.' : 'Your official Certificate of Participation is ready.'}
              </p>
              ${certificateUrl ? `
                <a href="${certificateUrl}" target="_blank" class="btn-view">
                  View & Download Certificate
                </a>
              ` : ''}
            </div>
          </div>

          <!-- Footer -->
          <div class="footer">
            <p style="margin: 0 0 6px 0; font-weight: 600; color: #374151;">HITian Inside • Haldia Institute of Technology</p>
            <p style="margin: 0;">Need assistance? Visit <a href="https://www.hitianinside.in/" target="_blank">www.hitianinside.in</a></p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  let attachments: Array<{ filename: string; content?: any }> | undefined;
  if (certificateAttachment && certificateAttachment.contentBase64) {
    attachments = [
      {
        filename: certificateAttachment.name || `${toName.replace(/\s+/g, '_')}_Certificate.pdf`,
        content: Buffer.from(certificateAttachment.contentBase64, 'base64')
      }
    ];
  }

  return await dispatchEmail({
    toEmail,
    toName,
    subject: `Certificate of Appreciation & Coupon Collection: ${eventTitle}`,
    htmlContent,
    attachments
  });
}
