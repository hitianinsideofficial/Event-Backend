import { dispatchEmail } from '../email-dispatcher.service.js';

export interface SendEmailParams {
  toEmail: string;
  toName: string;
  ticketId: string;
  eventTitle: string;
  eventDate: string;
  location: string;
  phone: string;
  answers?: Record<string, any>;
  qrCodeUrl?: string;
}

export async function sendRegistrationConfirmationEmail(params: SendEmailParams): Promise<boolean> {
  const { toEmail, toName, ticketId, eventTitle, eventDate, location, phone, answers, qrCodeUrl } = params;

  let answersHtml = '';
  if (answers && Object.keys(answers).length > 0) {
    const rows = Object.entries(answers)
      .map(([question, answer]) => {
        const formattedAns = Array.isArray(answer) ? answer.join(', ') : String(answer);
        return `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
            <td style="padding: 8px 12px; font-[#a69181]; font-size: 13px; font-weight: 600;">${question}</td>
            <td style="padding: 8px 12px; color: #ffffff; font-size: 13px;">${formattedAns}</td>
          </tr>
        `;
      })
      .join('');

    answersHtml = `
      <div style="margin-top: 20px; text-align: left;">
        <h4 style="color: #e6c594; margin-bottom: 8px; font-size: 14px;">Submitted Form Answers:</h4>
        <table style="width: 100%; border-collapse: collapse; background: rgba(0,0,0,0.2); border-radius: 8px; overflow: hidden;">
          ${rows}
        </table>
      </div>
    `;
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #150408; color: #fdfbf7; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #20070d; border: 1px solid rgba(230,197,148,0.3); border-radius: 16px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .header { text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px; margin-bottom: 24px; }
        .brand-title { color: #fdfbf7; font-size: 24px; font-weight: 800; margin: 0; }
        .sub-title { color: #a69181; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; margin-top: 4px; }
        .ticket-badge { background: linear-gradient(135deg, #800020 0%, #4a0013 100%); border: 1px solid #e6c594; color: #e6c594; font-family: monospace; font-size: 18px; font-weight: bold; padding: 12px 20px; border-radius: 12px; display: inline-block; margin: 16px 0; }
        .detail-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(255,255,255,0.06); font-size: 14px; }
        .label { color: #a69181; }
        .val { color: #ffffff; font-weight: 600; }
        .qr-box { text-align: center; margin: 24px 0; background: #ffffff; padding: 16px; border-radius: 16px; display: inline-block; }
        .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #a69181; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="brand-title">HITian Inside</h1>
          <div class="sub-title">Official Event Registration Confirmation</div>
        </div>

        <div style="text-align: center;">
          <h2 style="color: #ffffff; font-size: 20px; margin-bottom: 4px;">You are Registered!</h2>
          <p style="color: #a69181; font-size: 13px; margin-top: 0;">Here is your official pass details for <strong>${eventTitle}</strong>.</p>
          
          <div class="ticket-badge">${ticketId}</div>
        </div>

        ${qrCodeUrl ? `
          <div style="text-align: center;">
            <div class="qr-box">
              <img src="${qrCodeUrl}" alt="QR Ticket" width="180" height="180" style="display: block; margin: 0 auto;" />
            </div>
            <p style="color: #e6c594; font-size: 12px; margin-top: 4px;">Show this QR Code at the venue entry for instant check-in</p>
          </div>
        ` : ''}

        <div style="background: rgba(0,0,0,0.2); padding: 16px; border-radius: 12px; margin-top: 20px;">
          <div class="detail-row"><span class="label">Attendee Name:</span> <span class="val">${toName}</span></div>
          <div class="detail-row"><span class="label">Email Address:</span> <span class="val">${toEmail}</span></div>
          <div class="detail-row"><span class="label">Mobile Number:</span> <span class="val">${phone}</span></div>
          <div class="detail-row"><span class="label">Event Date:</span> <span class="val">${eventDate}</span></div>
          <div class="detail-row"><span class="label">Location / Venue:</span> <span class="val">${location}</span></div>
        </div>

        ${answersHtml}

        <div class="footer">
          <p>© 2026 HITian Inside. Official Event & Certificate Verification Portal.</p>
          <p style="font-size: 11px;">If you have any questions, visit <a href="https://www.hitianinside.in/" style="color: #e6c594; text-decoration: none;">www.hitianinside.in</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await dispatchEmail({
    toEmail,
    toName,
    subject: `Registration Confirmed: ${eventTitle} [Ticket: ${ticketId}]`,
    htmlContent
  });
}

export interface SendPratidhwaniEmailParams {
  toEmail: string;
  toName: string;
  ticketId: string;
  eventTitle: string;
  eventDate?: string;
  location?: string;
  phone?: string;
  answers?: Record<string, any>;
  qrCodeUrl?: string;
}

export async function sendPratidhwaniConfirmationEmail(params: SendPratidhwaniEmailParams): Promise<boolean> {
  const { toEmail, toName, ticketId, eventTitle, eventDate, location, phone, answers, qrCodeUrl } = params;

  const enrolledEvents = answers?.['Enrolled Event Options'] || answers?.['Enrolled Event Option'] || 'Pratidhwani Flagship Event';
  const totalAmount = answers?.['Payment Amount'] || 'RS. 50/- ONLY';
  const transactionUid = answers?.['Transaction UID'] || '-';
  const upiId = answers?.['UPI ID'] || '-';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #150408; color: #fdfbf7; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #1c060b; border: 2px solid #ff9933; border-radius: 20px; padding: 32px; box-shadow: 0 12px 40px rgba(255, 153, 51, 0.2); overflow: hidden; }
        .header { text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px; margin-bottom: 24px; }
        .brand-title { color: #ff9933; font-size: 28px; font-weight: 900; margin: 0; letter-spacing: 1px; }
        .sub-title { color: #e6c594; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 4px; }
        .conf-box { background: linear-gradient(135deg, rgba(128,0,32,0.6) 0%, rgba(42,8,16,0.8) 100%); border: 1px solid #ff9933; padding: 20px; border-radius: 16px; text-align: center; margin-bottom: 24px; }
        .pass-badge { background: #ff9933; color: #000000; font-family: monospace; font-size: 18px; font-weight: 900; padding: 10px 20px; border-radius: 12px; display: inline-block; margin-top: 12px; letter-spacing: 1px; }
        .qr-box { text-align: center; margin: 24px 0; background: #ffffff; padding: 16px; border-radius: 16px; display: inline-block; border: 2px solid #ff9933; }
        .detail-table { width: 100%; border-collapse: collapse; background: rgba(0,0,0,0.3); border-radius: 12px; margin-top: 16px; overflow: hidden; }
        .detail-table td { padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 13px; }
        .btn-wa { display: inline-block; background: #25D366; color: #ffffff; font-weight: 800; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-size: 14px; margin-top: 16px; box-shadow: 0 4px 15px rgba(37,211,102,0.3); }
        .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #a69181; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 class="brand-title">PRATIDHWANI</h1>
          <div class="sub-title">A unit of the Tabloid, Media and Literary Club • HITian Inside</div>
        </div>

        <div class="conf-box">
          <h2 style="color: #ffffff; font-size: 22px; margin: 0 0 6px 0;">Registration & Payment Confirmed</h2>
          <p style="color: #e6d7c3; font-size: 13px; margin: 0; line-height: 1.5;">
            Dear <strong>${toName}</strong>,<br/>
            Your registration for <strong>Pratidhwani</strong> has been officially confirmed! Below is your official digital entrance pass and details.
          </p>
          <div class="pass-badge">Pass ID: ${ticketId}</div>
        </div>

        ${qrCodeUrl ? `
          <div style="text-align: center;">
            <div class="qr-box">
              <img src="${qrCodeUrl}" alt="QR Entrance Pass" width="180" height="180" style="display: block; margin: 0 auto;" />
            </div>
            <p style="color: #ff9933; font-size: 12px; font-weight: bold; margin-top: 4px;">Present this QR Pass at Main Campus Grounds & SAC for check-in</p>
          </div>
        ` : ''}

        <div style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.1); padding: 20px; border-radius: 14px; margin-bottom: 24px;">
          <h4 style="color: #ff9933; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
            Verified Registration Details:
          </h4>

          <table class="detail-table">
            <tr>
              <td style="color: #a69181; font-weight: bold; width: 40%;">Participant Name:</td>
              <td style="color: #ffffff; font-weight: bold;">${toName}</td>
            </tr>
            <tr>
              <td style="color: #a69181; font-weight: bold;">Enrolled Categories:</td>
              <td style="color: #ff9933; font-weight: bold;">${enrolledEvents}</td>
            </tr>
            <tr>
              <td style="color: #a69181; font-weight: bold;">Payment Amount:</td>
              <td style="color: #25D366; font-weight: bold;">${totalAmount} (PAID)</td>
            </tr>
            <tr>
              <td style="color: #a69181; font-weight: bold;">Transaction UID:</td>
              <td style="color: #ffffff; font-mono font-bold;">${transactionUid}</td>
            </tr>
            <tr>
              <td style="color: #a69181; font-weight: bold;">UPI ID:</td>
              <td style="color: #ffffff;">${upiId}</td>
            </tr>
            <tr>
              <td style="color: #a69181; font-weight: bold;">Venue & Timing:</td>
              <td style="color: #ffffff;">Main Campus Grounds & SAC • August 15, 2026</td>
            </tr>
          </table>

          <div style="text-align: center; margin-top: 20px;">
            <a href="https://chat.whatsapp.com/HITianInsidePratidhawni2026" class="btn-wa" target="_blank">
              Join Official Pratidhwani WhatsApp Group →
            </a>
          </div>
        </div>

        <div class="footer">
          <p>© 2026 HITian Inside. Official Event & Digital Pass System.</p>
          <p style="font-size: 11px;">Visit us at <a href="https://www.hitianinside.in/" style="color: #ff9933; text-decoration: none;">www.hitianinside.in</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await dispatchEmail({
    toEmail,
    toName,
    subject: `Registration Confirmed: PRATIDHWANI [Pass: ${ticketId}]`,
    htmlContent
  });
}
