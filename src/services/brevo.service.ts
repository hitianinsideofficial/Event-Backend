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
