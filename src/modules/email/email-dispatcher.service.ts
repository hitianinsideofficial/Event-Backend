import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

function getSmtpTransporter() {
  const smtpKey = process.env.BREVO_SMTP_KEY || process.env.BREVO_API_KEY;
  const smtpLogin = process.env.BREVO_SMTP_LOGIN || process.env.BREVO_SENDER_EMAIL || process.env.ADMIN_EMAIL || 'event@hitianinside.in';

  if (!smtpKey) return null;

  return nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, // TLS
    auth: {
      user: smtpLogin,
      pass: smtpKey
    }
  });
}

export async function dispatchEmail({
  toEmail,
  toName,
  subject,
  htmlContent,
  attachments
}: {
  toEmail: string;
  toName: string;
  subject: string;
  htmlContent: string;
  attachments?: Array<{ filename: string; content?: any; path?: string }>;
}): Promise<boolean> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'event@hitianinside.in';
  const senderName = process.env.BREVO_SENDER_NAME || 'HITian Inside Events';

  // 1. Try Brevo REST API first
  if (apiKey) {
    try {
      const restPayload: any = {
        sender: { name: senderName, email: senderEmail },
        to: [{ email: toEmail, name: toName }],
        subject,
        htmlContent
      };

      if (attachments && attachments.length > 0) {
        restPayload.attachment = attachments.map(a => ({
          name: a.filename,
          content: typeof a.content === 'string' ? a.content : Buffer.from(a.content).toString('base64')
        }));
      }

      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': apiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify(restPayload)
      });

      if (res.ok) {
        console.log(`✉️ Email successfully dispatched via Brevo REST API to ${toEmail}`);
        return true;
      } else {
        const errText = await res.text();
        console.warn('⚠️ Brevo REST API returned non-200. Falling back to Brevo SMTP Relay. Reason:', errText);
      }
    } catch (restErr: any) {
      console.warn('⚠️ Brevo REST API failed with exception, switching to SMTP Relay:', restErr.message);
    }
  }

  // 2. Fallback to Brevo SMTP Relay
  try {
    const transporter = getSmtpTransporter();
    if (!transporter) {
      console.error('❌ Neither BREVO_API_KEY nor BREVO_SMTP_KEY is configured.');
      return false;
    }

    const mailOptions: any = {
      from: `"${senderName}" <${senderEmail}>`,
      to: `"${toName}" <${toEmail}>`,
      subject,
      html: htmlContent
    };

    if (attachments && attachments.length > 0) {
      mailOptions.attachments = attachments.map(a => ({
        filename: a.filename,
        content: a.content
      }));
    }

    const info = await transporter.sendMail(mailOptions);
    console.log(`✉️ Email successfully dispatched via Brevo SMTP Relay to ${toEmail} (MessageId: ${info.messageId})`);
    return true;
  } catch (smtpErr: any) {
    console.error('❌ Brevo SMTP Relay delivery also failed:', smtpErr.message);
    return false;
  }
}
