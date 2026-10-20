import { dispatchEmail } from '../email-dispatcher.service.js';

export interface SendNavroopamEmailParams {
  toEmail: string;
  toName: string;
  ticketId: string;
  eventTitle: string;
  eventDate?: string;
  location?: string;
  phone?: string;
  answers?: Record<string, any>;
  qrCodeUrl?: string;
  instagramPostUrl?: string;
}

export async function sendSubmissionReceivedEmail(params: SendNavroopamEmailParams): Promise<boolean> {
  const { toEmail, toName, ticketId, eventTitle, answers } = params;

  const selectedDomain = answers?.['Selected Domain'] || 'General Entry';
  const selectedTheme = answers?.['Selected Theme'] || '-';
  const transactionUid = answers?.['Transaction UID (UTR)'] || answers?.['Transaction UID'] || answers?.['UTR Number'] || '-';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .banner-wrap { width: 100%; background: #150408; text-align: center; }
        .banner-img { width: 100%; max-height: 220px; object-fit: cover; display: block; }
        .body-content { padding: 32px 28px; }
        .badge { display: inline-block; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; font-size: 11px; font-weight: bold; text-transform: uppercase; padding: 4px 10px; border-radius: 4px; margin-bottom: 12px; }
        .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; }
        .subtext { font-size: 13px; color: #475569; margin: 0 0 20px 0; line-height: 1.5; }
        .table-box { width: 100%; border-collapse: collapse; background: #f8fafc; border: 1px solid #e2e8f0; margin-bottom: 20px; font-size: 13px; }
        .table-box td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; }
        .table-label { color: #64748b; font-weight: 600; width: 40%; }
        .table-val { color: #0f172a; font-weight: 700; }
        .info-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 16px; border-radius: 6px; font-size: 12px; color: #166534; line-height: 1.5; margin-bottom: 20px; }
        .contact-box { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 14px 18px; border-radius: 6px; font-size: 12px; color: #334155; margin-bottom: 20px; }
        .footer { text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="banner-wrap">
          <img src="https://ik.imagekit.io/n6cw3mewa/navroopam_banner.png" alt="${eventTitle || 'Event'}" class="banner-img" />
        </div>

        <div class="body-content">
          <div class="badge">Payment & Submission Received</div>
          <h1 class="title">We Have Received Your Submission & Payment</h1>
          <p class="subtext">
            Dear <strong>${toName}</strong>,<br/>
            Thank you for registering for <strong>${eventTitle || 'NAVROOPAM v7.0'}</strong>. We have successfully received your submission entry along with your registration payment details.
          </p>

          <table class="table-box">
            <tr>
              <td class="table-label">Participant Name</td>
              <td class="table-val">${toName}</td>
            </tr>
            <tr>
              <td class="table-label">Registration Pass</td>
              <td class="table-val" style="font-family: monospace;">${ticketId}</td>
            </tr>
            <tr>
              <td class="table-label">Selected Domain</td>
              <td class="table-val">${selectedDomain}</td>
            </tr>
            <tr>
              <td class="table-label">Chosen Theme</td>
              <td class="table-val">${selectedTheme}</td>
            </tr>
            <tr>
              <td class="table-label">Payment Status</td>
              <td class="table-val" style="color: #15803d; font-weight: bold;">PAYMENT RECEIVED</td>
            </tr>
            <tr>
              <td class="table-label">Transaction UTR</td>
              <td class="table-val" style="font-family: monospace;">${transactionUid}</td>
            </tr>
          </table>

          <div class="info-box">
            <strong>What Happens Next?</strong><br/>
            Our organizing panel has received your entry and payment. Your submission is now queued for feature on our official Instagram handle.
            Once your post goes live on Instagram, we will send you a follow-up confirmation email containing the direct link to your post!
          </div>

          <div class="contact-box">
            <strong>Questions or Queries?</strong><br/>
            If you have any questions or need to rectify your submission details, please email our coordination team:
            <br/>
            <span style="font-family: monospace; font-weight: bold; color: #0f172a;">event@hitianinside.in &bull; hitianinside@gmail.com</span>
          </div>

          <div class="footer">
            <p>© 2026 HITian Inside &bull; Haldia Institute of Technology</p>
            <p style="margin-top: 4px;">Official Student Tabloid, Media & Socio-Cultural Club</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return await dispatchEmail({
    toEmail,
    toName,
    subject: `Submission & Payment Received: ${eventTitle || 'NAVROOPAM v7.0'} [Pass: ${ticketId}]`,
    htmlContent
  });
}

export async function sendNavroopamConfirmationEmail(params: SendNavroopamEmailParams): Promise<boolean> {
  const { toEmail, toName, ticketId, eventTitle, eventDate, location, phone, answers, instagramPostUrl } = params;

  const selectedDomain = answers?.['Selected Domain'] || 'Navroopam Festive Domain';
  const selectedTheme = answers?.['Selected Theme'] || '-';
  const transactionUid = answers?.['Transaction UID (UTR)'] || answers?.['Transaction UID'] || answers?.['UTR Number'] || '-';
  const rollNumber = answers?.['College Roll Number'] || '-';
  const department = answers?.['Department'] || '-';
  const academicYear = answers?.['Academic Year'] || '-';
  const driveLink = answers?.['Google Drive Video Reel Link'] || answers?.['Google Drive Video Link'] || '';
  const postUrl = (instagramPostUrl && instagramPostUrl.trim()) ? instagramPostUrl.trim() : 'https://www.instagram.com/hitianinside/';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
        .banner-wrap { width: 100%; background: #150408; text-align: center; }
        .banner-img { width: 100%; max-height: 220px; object-fit: cover; display: block; }
        .body-content { padding: 32px 28px; }
        .badge { display: inline-block; background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; font-size: 11px; font-weight: bold; text-transform: uppercase; padding: 4px 10px; border-radius: 4px; margin-bottom: 12px; }
        .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0 0 8px 0; }
        .subtext { font-size: 13px; color: #475569; margin: 0 0 20px 0; line-height: 1.5; }
        .table-box { width: 100%; border-collapse: collapse; background: #f8fafc; border: 1px solid #e2e8f0; margin-bottom: 24px; font-size: 13px; }
        .table-box td { padding: 10px 14px; border-bottom: 1px solid #e2e8f0; }
        .table-label { color: #64748b; font-weight: 600; width: 40%; }
        .table-val { color: #0f172a; font-weight: 700; }
        .ig-box { background: #0f172a; color: #ffffff; padding: 24px; border-radius: 8px; text-align: center; margin-bottom: 24px; border: 1px solid #1e293b; }
        .ig-btn { display: inline-block; background: linear-gradient(135deg, #e11d48, #d97706); color: #ffffff; text-decoration: none; font-size: 13px; font-weight: bold; text-transform: uppercase; padding: 12px 24px; border-radius: 4px; margin-top: 14px; letter-spacing: 0.05em; }
        .tips-box { background: #fffbeb; border: 1px solid #fde68a; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 6px; font-size: 13px; color: #78350f; line-height: 1.6; margin-bottom: 24px; }
        .contact-box { background: #f1f5f9; border: 1px solid #cbd5e1; padding: 14px 18px; border-radius: 6px; font-size: 12px; color: #334155; margin-bottom: 24px; }
        .footer { text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 24px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="banner-wrap">
          <img src="https://ik.imagekit.io/n6cw3mewa/navroopam_banner.png" alt="NAVROOPAM v7.0" class="banner-img" />
        </div>

        <div class="body-content">
          <div class="badge">You Are Live on Instagram</div>
          <h1 class="title">Your Submission is Live on Instagram!</h1>
          <p class="subtext">
            Dear <strong>${toName}</strong>,<br/>
            Congratulations! Your submission for <strong>NAVROOPAM v7.0</strong> has been officially featured and published on the <strong>HITian Inside</strong> Instagram page.
          </p>

          <table class="table-box">
            <tr>
              <td class="table-label">Participant Name</td>
              <td class="table-val">${toName}</td>
            </tr>
            <tr>
              <td class="table-label">Registration Pass</td>
              <td class="table-val" style="font-family: monospace;">${ticketId}</td>
            </tr>
            <tr>
              <td class="table-label">Selected Domain</td>
              <td class="table-val">${selectedDomain}</td>
            </tr>
            <tr>
              <td class="table-label">Chosen Theme</td>
              <td class="table-val">${selectedTheme}</td>
            </tr>
          </table>

          <div class="ig-box">
            <div style="font-size: 14px; font-weight: 800; color: #fde68a; text-transform: uppercase; letter-spacing: 0.05em;">Your Official Instagram Feature Link</div>
            <p style="font-size: 13px; color: #e2e8f0; margin: 8px 0 0 0; line-height: 1.5;">
              Here is the direct link to your published entry on our official handle:
            </p>
            <a href="${postUrl}" class="ig-btn" target="_blank">
              Open Your Post on Instagram ↗
            </a>
            <div style="margin-top: 12px; font-size: 11px; color: #94a3b8; word-break: break-all;">
              <a href="${postUrl}" target="_blank" style="color: #38bdf8; text-decoration: underline;">${postUrl}</a>
            </div>
          </div>

          <div class="tips-box">
            <strong style="color: #92400e; font-size: 14px;">Share with friends, grab likes & win exciting prizes!</strong>
            <p style="margin: 6px 0 0 0;">
              Public engagement, audience appreciation, and peer votes play a huge role in the contest! 
              Share your post link on your Instagram Story, WhatsApp groups, and with your friends. 
              The more love and likes your post gets, the higher your chances to stand out and take home the winning prize!
            </p>
          </div>

          <div class="contact-box">
            <strong>Questions or Queries?</strong><br/>
            If you have any questions regarding event evaluation or prizes, reach out to our team:
            <br/>
            <span style="font-family: monospace; font-weight: bold; color: #0f172a;">event@hitianinside.in &bull; hitianinside@gmail.com</span>
          </div>

          <div class="footer">
            <p>© 2026 HITian Inside &bull; Haldia Institute of Technology</p>
            <p style="margin-top: 4px;">Official Student Tabloid, Media & Socio-Cultural Club</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return await dispatchEmail({
    toEmail,
    toName,
    subject: `Your Entry is Live on Instagram! Share & Grab Likes to Win [Pass: ${ticketId}]`,
    htmlContent
  });
}
