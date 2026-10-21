import { dispatchEmail } from '../email-dispatcher.service.js';

export interface SendDriveUpdateEmailParams {
  toEmail: string;
  toName: string;
  ticketId: string;
  eventTitle: string;
  domainTitle?: string;
  updateUrl: string;
}

export async function sendDriveLinkUpdateEmail(params: SendDriveUpdateEmailParams): Promise<boolean> {
  const { toEmail, toName, ticketId, eventTitle, domainTitle, updateUrl } = params;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { margin: 0; padding: 0; background-color: #0b0204; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #fdfbf7; }
        .wrapper { width: 100%; background-color: #0b0204; padding: 24px 12px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #170409; border: 1px solid #e6c594; border-radius: 6px; overflow: hidden; }
        .banner-wrap { width: 100%; background: #150408; text-align: center; border-bottom: 2px solid #e6c594; }
        .banner-img { width: 100%; max-height: 220px; object-fit: cover; display: block; }
        .header { background: linear-gradient(135deg, #4a000e 0%, #170409 100%); padding: 24px 20px; text-align: center; border-bottom: 1px solid rgba(230, 197, 148, 0.3); }
        .title { color: #fdfbf7; font-size: 20px; font-weight: 900; margin: 0; letter-spacing: 1px; text-transform: uppercase; }
        .subtitle { color: #e6c594; font-size: 13px; font-weight: 700; margin-top: 6px; letter-spacing: 0.5px; }
        .content { padding: 32px 24px; }
        .greeting { font-size: 16px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
        .message { font-size: 14px; line-height: 1.6; color: #e6d7c3; margin-bottom: 20px; }
        .alert-box { background-color: rgba(220, 38, 38, 0.15); border-left: 4px solid #ef4444; padding: 16px; margin: 20px 0; border-radius: 4px; }
        .alert-title { color: #fca5a5; font-size: 14px; font-weight: 800; margin: 0 0 4px 0; }
        .alert-text { color: #fee2e2; font-size: 13px; line-height: 1.5; margin: 0; }
        .steps-box { background-color: #240710; border: 1px solid rgba(230, 197, 148, 0.3); border-radius: 6px; padding: 20px; margin: 24px 0; }
        .steps-title { color: #e6c594; font-size: 14px; font-weight: 800; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px; }
        .step-item { display: flex; align-items: flex-start; margin-bottom: 12px; font-size: 13px; color: #fdfbf7; line-height: 1.5; }
        .step-num { background-color: #800020; color: #e6c594; width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; font-size: 11px; margin-right: 12px; flex-shrink: 0; border: 1px solid #e6c594; }
        .btn-container { text-align: center; margin: 32px 0 24px 0; }
        .btn-action { display: inline-block; background: linear-gradient(135deg, #d97706 0%, #b45309 100%); color: #ffffff !important; font-weight: 800; font-size: 14px; padding: 14px 28px; text-decoration: none; border-radius: 4px; border: 1px solid #fcd34d; letter-spacing: 0.5px; }
        .warning-note { background-color: rgba(217, 119, 6, 0.1); border: 1px dashed #d97706; padding: 12px; border-radius: 4px; font-size: 12px; color: #fcd34d; text-align: center; margin-top: 16px; }
        .footer { background-color: #0e0205; border-top: 1px solid rgba(230, 197, 148, 0.2); padding: 20px 24px; text-align: center; font-size: 11px; color: #a69181; }
        .footer a { color: #e6c594; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="banner-wrap">
            <img src="https://ik.imagekit.io/n6cw3mewa/navroopam_banner.png" alt="${eventTitle || 'NAVROOPAM v7.0'}" class="banner-img" />
          </div>
          <div class="header">
            <h1 class="title">Action Required: Make Drive Link Public</h1>
            <div class="subtitle">HITian Inside &bull; ${eventTitle}</div>
          </div>
          <div class="content">
            <p class="greeting">Dear ${toName},</p>
            <p class="message">
              Thank you for participating in <strong>${eventTitle}</strong> under the <strong>${domainTitle || 'Puja Vlog'}</strong> domain (Registration Pass: <code style="color:#e6c594; font-weight:bold;">${ticketId}</code>).
            </p>

            <div class="alert-box">
              <div class="alert-title">Google Drive Link is Private / Restricted</div>
              <p class="alert-text">
                Our judging panel attempted to view your submitted video entry, but the Google Drive access permission is currently set to <strong>"Restricted"</strong>. Because of this, judges cannot evaluate your submission.
              </p>
            </div>

            <div class="steps-box">
              <div class="steps-title">Steps to Make Your Google Drive Link Public:</div>
              <div class="step-item">
                <span class="step-num">1</span>
                <span>Open your <strong>Google Drive</strong> and locate your uploaded video file.</span>
              </div>
              <div class="step-item">
                <span class="step-num">2</span>
                <span>Right-click on the video file (or tap the 3 dots on mobile) and select <strong>"Share" &rarr; "Share"</strong>.</span>
              </div>
              <div class="step-item">
                <span class="step-num">3</span>
                <span>Under <strong>"General access"</strong>, click on <em>"Restricted"</em> and change it to <strong>"Anyone with the link"</strong>.</span>
              </div>
              <div class="step-item">
                <span class="step-num">4</span>
                <span>Ensure the role on the right is set to <strong>"Viewer"</strong>, then click <strong>"Copy link"</strong>.</span>
              </div>
              <div class="step-item">
                <span class="step-num">5</span>
                <span>Click the button below to paste and submit your updated, public video link.</span>
              </div>
            </div>

            <div class="btn-container">
              <a href="${updateUrl}" target="_blank" class="btn-action">
                Click Here to Update Your Video Link &rarr;
              </a>
            </div>

            <div class="warning-note">
              <strong>One-Time Update Policy:</strong> For competition integrity, this secure link can only be used <strong>ONE TIME</strong>. Once submitted, the link will immediately expire. Please test your link in an incognito window before submitting!
            </div>
          </div>

          <div class="footer">
            <p style="margin: 0 0 6px 0; font-weight: 700; color: #fdfbf7;">HITian Inside &bull; Haldia Institute of Technology</p>
            <p style="margin: 0;">If you need assistance, contact us at <a href="mailto:event@hitianinside.in">event@hitianinside.in</a></p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return await dispatchEmail({
    toEmail,
    toName,
    subject: `Action Required: Make Google Drive Video Link Public [Pass: ${ticketId}]`,
    htmlContent
  });
}

export interface SendResubmissionRequestEmailParams {
  toEmail: string;
  toName: string;
  ticketId: string;
  eventTitle: string;
  domainTitle?: string;
  rejectionReason: string;
  updateUrl: string;
}

export async function sendResubmissionRequestEmail(params: SendResubmissionRequestEmailParams): Promise<boolean> {
  const { toEmail, toName, ticketId, eventTitle, domainTitle, rejectionReason, updateUrl } = params;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { margin: 0; padding: 0; background-color: #0b0204; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #fdfbf7; }
        .wrapper { width: 100%; background-color: #0b0204; padding: 24px 12px; }
        .container { max-width: 600px; margin: 0 auto; background-color: #170409; border: 1px solid #e6c594; border-radius: 6px; overflow: hidden; }
        .banner-wrap { width: 100%; background: #150408; text-align: center; border-bottom: 2px solid #e6c594; }
        .banner-img { width: 100%; max-height: 220px; object-fit: cover; display: block; }
        .header { background: linear-gradient(135deg, #4a000e 0%, #170409 100%); padding: 24px 20px; text-align: center; border-bottom: 1px solid rgba(230, 197, 148, 0.3); }
        .title { color: #fdfbf7; font-size: 20px; font-weight: 900; margin: 0; letter-spacing: 1px; text-transform: uppercase; }
        .subtitle { color: #e6c594; font-size: 13px; font-weight: 700; margin-top: 6px; letter-spacing: 0.5px; }
        .content { padding: 32px 24px; }
        .greeting { font-size: 16px; font-weight: 700; color: #ffffff; margin-bottom: 12px; }
        .message { font-size: 14px; line-height: 1.6; color: #e6d7c3; margin-bottom: 20px; }
        .reason-box { background-color: rgba(220, 38, 38, 0.15); border-left: 4px solid #ef4444; padding: 18px; margin: 20px 0; border-radius: 4px; }
        .reason-title { color: #fca5a5; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 6px 0; }
        .reason-text { color: #fee2e2; font-size: 14px; font-weight: 700; line-height: 1.5; margin: 0; }
        .guidelines-box { background-color: #240710; border: 1px solid rgba(230, 197, 148, 0.3); border-radius: 6px; padding: 20px; margin: 24px 0; }
        .guidelines-title { color: #e6c594; font-size: 14px; font-weight: 800; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px; }
        .rule-item { display: flex; align-items: flex-start; margin-bottom: 12px; font-size: 13px; color: #fdfbf7; line-height: 1.5; }
        .rule-num { background-color: #800020; color: #e6c594; width: 22px; height: 22px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-weight: 900; font-size: 11px; margin-right: 12px; flex-shrink: 0; border: 1px solid #e6c594; }
        .btn-container { text-align: center; margin: 32px 0 24px 0; }
        .btn-action { display: inline-block; background: linear-gradient(135deg, #d97706 0%, #b45309 100%); color: #ffffff !important; font-weight: 800; font-size: 14px; padding: 14px 28px; text-decoration: none; border-radius: 4px; border: 1px solid #fcd34d; letter-spacing: 0.5px; }
        .warning-note { background-color: rgba(217, 119, 6, 0.1); border: 1px dashed #d97706; padding: 12px; border-radius: 4px; font-size: 12px; color: #fcd34d; text-align: center; margin-top: 16px; }
        .footer { background-color: #0e0205; border-top: 1px solid rgba(230, 197, 148, 0.2); padding: 20px 24px; text-align: center; font-size: 11px; color: #a69181; }
        .footer a { color: #e6c594; text-decoration: none; }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="container">
          <div class="banner-wrap">
            <img src="https://ik.imagekit.io/n6cw3mewa/navroopam_banner.png" alt="${eventTitle || 'NAVROOPAM v7.0'}" class="banner-img" />
          </div>
          <div class="header">
            <h1 class="title">Action Required: Re-upload Your Submission</h1>
            <div class="subtitle">HITian Inside &bull; ${eventTitle}</div>
          </div>
          <div class="content">
            <p class="greeting">Dear ${toName},</p>
            <p class="message">
              Thank you for participating in <strong>${eventTitle}</strong> under the <strong>${domainTitle || 'Contest'}</strong> domain (Registration Pass: <code style="color:#e6c594; font-weight:bold;">${ticketId}</code>).
            </p>

            <div class="reason-box">
              <div class="reason-title">Reason Why Your Submission Was Rejected:</div>
              <p class="reason-text">
                &ldquo;${rejectionReason}&rdquo;
              </p>
            </div>

            <div class="guidelines-box">
              <div class="guidelines-title">Important Re-upload Guidelines:</div>
              <div class="rule-item">
                <span class="rule-num">1</span>
                <span><strong>Photo Not Uploaded:</strong> Ensure you upload a clear, high-resolution original photograph or artwork image.</span>
              </div>
              <div class="rule-item">
                <span class="rule-num">2</span>
                <span><strong>No Collages Allowed:</strong> Against competition rules, you cannot upload collages or multi-photo grids. Only single original submissions are accepted.</span>
              </div>
              <div class="rule-item">
                <span class="rule-num">3</span>
                <span><strong>Avoid File Position Swaps:</strong> Ensure you are uploading your actual entry photo/file, NOT your UPI payment screenshot proof.</span>
              </div>
              <div class="rule-item">
                <span class="rule-num">4</span>
                <span>Supported file formats include JPEG, PNG, WEBP, and PDF documents.</span>
              </div>
            </div>

            <div class="btn-container">
              <a href="${updateUrl}" target="_blank" class="btn-action">
                Click Here to Re-upload Your Submission &rarr;
              </a>
            </div>

            <div class="warning-note">
              <strong>One-Time Re-upload Policy:</strong> For competition integrity, this secure link can only be used <strong>ONE TIME</strong>. Once submitted, your replacement entry will be permanently locked and sent straight to our judges for final review.
            </div>
          </div>

          <div class="footer">
            <p style="margin: 0 0 6px 0; font-weight: 700; color: #fdfbf7;">HITian Inside &bull; Haldia Institute of Technology</p>
            <p style="margin: 0;">If you need assistance, contact us at <a href="mailto:event@hitianinside.in">event@hitianinside.in</a></p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;

  return await dispatchEmail({
    toEmail,
    toName,
    subject: `Action Required: Re-upload Your Submission [Pass: ${ticketId}]`,
    htmlContent
  });
}
