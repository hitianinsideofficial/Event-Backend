import dotenv from 'dotenv';
dotenv.config();

interface SendEmailParams {
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
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'event@hitianinside.in';
  const senderName = process.env.BREVO_SENDER_NAME || 'HITian Inside Events';

  if (!apiKey) {
    console.warn('⚠️ BREVO_API_KEY is not set in environment variables. Skipping confirmation email delivery.');
    return false;
  }

  const { toEmail, toName, ticketId, eventTitle, eventDate, location, phone, answers, qrCodeUrl } = params;

  // Format submitted answers into an HTML list
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
          <h2 style="color: #ffffff; font-size: 20px; margin-bottom: 4px;">🎉 You are Registered!</h2>
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

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: toEmail, name: toName }],
        subject: `Registration Confirmed: ${eventTitle} [Ticket: ${ticketId}]`,
        htmlContent
      })
    });

    if (res.ok) {
      console.log(`✉️ Brevo Confirmation Email sent successfully to ${toEmail}`);
      return true;
    } else {
      const errText = await res.text();
      console.error('❌ Brevo Email Delivery Failed:', errText);
      return false;
    }
  } catch (err: any) {
    console.error('❌ Brevo API Error:', err);
    return false;
  }
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
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'event@hitianinside.in';
  const senderName = process.env.BREVO_SENDER_NAME || 'HITian Inside Events';

  if (!apiKey) {
    console.warn('⚠️ BREVO_API_KEY is not set. Skipping Pratidhwani confirmation email delivery.');
    return false;
  }

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
          <h2 style="color: #ffffff; font-size: 22px; margin: 0 0 6px 0;">🎉 Registration & Payment Confirmed!</h2>
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
            📋 Verified Registration Details:
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
              💬 Join Official Pratidhwani WhatsApp Group →
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

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: toEmail, name: toName }],
        subject: `🎉 Registration Confirmed: PRATIDHWANI [Pass: ${ticketId}]`,
        htmlContent
      })
    });

    if (res.ok) {
      console.log(`✉️ Pratidhwani Confirmation Email sent successfully to ${toEmail}`);
      return true;
    } else {
      const errText = await res.text();
      console.error('❌ Brevo Email Delivery Failed:', errText);
      return false;
    }
  } catch (err: any) {
    console.error('❌ Brevo API Error:', err);
    return false;
  }
}

export interface SendAckEmailParams {
  toEmail: string;
  toName: string;
  ticketId: string;
  eventTitle: string;
  domainTitle?: string;
  themeTitle?: string;
  submissionLink?: string;
  answers?: Record<string, any>;
}

export async function sendSubmissionAcknowledgmentEmail(params: SendAckEmailParams): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'event@hitianinside.in';
  const senderName = process.env.BREVO_SENDER_NAME || 'HITian Inside Events';

  if (!apiKey) {
    console.warn('⚠️ BREVO_API_KEY is not set. Skipping acknowledgment email delivery.');
    return false;
  }

  const { toEmail, toName, ticketId, eventTitle, domainTitle, themeTitle, submissionLink, answers } = params;

  let answersRows = '';
  if (answers && Object.keys(answers).length > 0) {
    answersRows = Object.entries(answers)
      .map(([k, v]) => `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
          <td style="padding: 8px 12px; color: #ff9933; font-size: 13px; font-weight: bold; width: 40%;">${k}</td>
          <td style="padding: 8px 12px; color: #ffffff; font-size: 13px;">${Array.isArray(v) ? v.join(', ') : String(v)}</td>
        </tr>
      `).join('');
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #120306; color: #fdfbf7; margin: 0; padding: 20px; }
        .container { max-width: 600px; margin: 0 auto; background: #1c060b; border: 2px solid #ff9933; border-radius: 20px; padding: 32px; box-shadow: 0 12px 40px rgba(255, 153, 51, 0.15); overflow: hidden; }
        .tricolour-bar { height: 8px; font-size: 0; line-height: 0; border-radius: 4px; overflow: hidden; margin-bottom: 24px; }
        .tc-saffron { display: inline-block; width: 33.33%; height: 8px; background-color: #FF9933 !important; }
        .tc-white { display: inline-block; width: 33.34%; height: 8px; background-color: #FFFFFF !important; }
        .tc-green { display: inline-block; width: 33.33%; height: 8px; background-color: #138808 !important; }
        .header { text-align: center; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 20px; margin-bottom: 24px; }
        .brand-title { color: #ffffff; font-size: 26px; font-weight: 900; margin: 0; letter-spacing: 0.5px; }
        .sub-title { color: #ff9933; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 1.5px; margin-top: 6px; }
        .thankyou-box { background: linear-gradient(135deg, rgba(255,153,51,0.15) 0%, rgba(19,136,8,0.15) 100%); border: 1px solid rgba(255,153,51,0.4); padding: 20px; border-radius: 16px; text-align: center; margin-bottom: 24px; }
        .ticket-badge { background: #800020; border: 1px solid #ff9933; color: #ff9933; font-family: monospace; font-size: 16px; font-weight: bold; padding: 8px 16px; border-radius: 10px; display: inline-block; margin-top: 10px; }
        .detail-table { width: 100%; border-collapse: collapse; background: rgba(0,0,0,0.3); border-radius: 12px; margin-top: 16px; overflow: hidden; }
        .footer { text-align: center; margin-top: 32px; font-size: 12px; color: #a69181; border-top: 1px solid rgba(255,255,255,0.1); padding-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="tricolour-bar">
          <table width="100%" border="0" cellspacing="0" cellpadding="0" style="table-layout: fixed; width: 100%;">
            <tr>
              <td width="33.33%" bgcolor="#FF9933" style="background-color: #FF9933 !important; height: 8px; font-size: 1px; line-height: 1px;">&nbsp;</td>
              <td width="33.34%" bgcolor="#FFFFFF" style="background-color: #FFFFFF !important; height: 8px; font-size: 1px; line-height: 1px;">&nbsp;</td>
              <td width="33.33%" bgcolor="#138808" style="background-color: #138808 !important; height: 8px; font-size: 1px; line-height: 1px;">&nbsp;</td>
            </tr>
          </table>
        </div>
        <div class="header">
          <h1 class="brand-title">🇮🇳 HITian Inside</h1>
          <div class="sub-title">Flagship Independence Event: ${eventTitle}</div>
        </div>

        <div class="thankyou-box">
          <h2 style="color: #ffffff; font-size: 22px; margin: 0 0 8px 0;">✨ Submission Acknowledged!</h2>
          <p style="color: #e6d7c3; font-size: 14px; line-height: 1.6; margin: 0;">
            Dear <strong>${toName}</strong>,<br/>
            On behalf of the entire <strong>HITian Inside Team</strong>, thank you for participating in <strong>${eventTitle}</strong>! Your competition entry has been officially verified & acknowledged by our organizing panel.
          </p>
          <div class="ticket-badge">Ticket: ${ticketId}</div>
        </div>

        <div style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.1); padding: 20px; border-radius: 14px; margin-bottom: 24px;">
          <h4 style="color: #ff9933; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
            📋 Acknowledged Submission Summary:
          </h4>

          <table class="detail-table">
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
              <td style="padding: 10px 12px; color: #a69181; font-size: 13px; font-weight: bold;">Participant Name:</td>
              <td style="padding: 10px 12px; color: #ffffff; font-size: 13px; font-weight: bold;">${toName}</td>
            </tr>
            ${domainTitle ? `
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                <td style="padding: 10px 12px; color: #a69181; font-size: 13px; font-weight: bold;">Submitted Domain:</td>
                <td style="padding: 10px 12px; color: #ff9933; font-size: 13px; font-weight: bold;">${domainTitle}</td>
              </tr>
            ` : ''}
            ${themeTitle ? `
              <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                <td style="padding: 10px 12px; color: #a69181; font-size: 13px; font-weight: bold;">Chosen Theme:</td>
                <td style="padding: 10px 12px; color: #ffffff; font-size: 13px; font-weight: bold;">${themeTitle}</td>
              </tr>
            ` : ''}
            ${answersRows}
          </table>

          ${submissionLink ? `
            <div style="margin-top: 16px; text-align: center;">
              <a href="${submissionLink}" target="_blank" style="background: #138808; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 8px; font-size: 13px; font-weight: bold; display: inline-block;">
                🔗 View Your Submitted Media File
              </a>
            </div>
          ` : ''}
        </div>

        <div style="text-align: center; background: rgba(255,153,51,0.08); padding: 16px; border-radius: 12px; border: 1px dashed rgba(255,153,51,0.3);">
          <p style="color: #ffffff; font-size: 13px; margin: 0 0 6px 0; font-weight: bold;">
            🇮🇳 Happy Independence Day from HITian Inside!
          </p>
          <p style="color: #a69181; font-size: 12px; margin: 0;">
            Our panel of judges is currently evaluating all entries. Event results and certificates of participation will be issued on our official portal.
          </p>
        </div>

        <div class="footer">
          <p>© 2026 HITian Inside. Official Event & Certificate Portal.</p>
          <p style="font-size: 11px;">Visit us at <a href="https://www.hitianinside.in/" style="color: #ff9933; text-decoration: none;">www.hitianinside.in</a></p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: toEmail, name: toName }],
        subject: `🇮🇳 Submission Acknowledged: ${eventTitle} ${domainTitle ? `- ${domainTitle}` : ''} [Ticket: ${ticketId}]`,
        htmlContent
      })
    });

    if (res.ok) {
      console.log(`✉️ Brevo Acknowledgment Email sent to ${toEmail}`);
      return true;
    } else {
      const errText = await res.text();
      console.error('❌ Brevo Acknowledgment Email Failed:', errText);
      return false;
    }
  } catch (err: any) {
    console.error('❌ Brevo Acknowledgment Exception:', err.message);
    return false;
  }
}
