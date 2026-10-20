import { dispatchEmail } from '../email-dispatcher.service.js';

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
          <h1 class="brand-title">HITian Inside</h1>
          <div class="sub-title">Flagship Independence Event: ${eventTitle}</div>
        </div>

        <div class="thankyou-box">
          <h2 style="color: #ffffff; font-size: 22px; margin: 0 0 8px 0;">Submission Acknowledged</h2>
          <p style="color: #e6d7c3; font-size: 14px; line-height: 1.6; margin: 0;">
            Dear <strong>${toName}</strong>,<br/>
            On behalf of the entire <strong>HITian Inside Team</strong>, thank you for participating in <strong>${eventTitle}</strong>! Your competition entry has been officially verified & acknowledged by our organizing panel.
          </p>
          <div class="ticket-badge">Ticket: ${ticketId}</div>
        </div>

        <div style="background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.1); padding: 20px; border-radius: 14px; margin-bottom: 24px;">
          <h4 style="color: #ff9933; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">
            Acknowledged Submission Summary:
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
                View Your Submitted Media File
              </a>
            </div>
          ` : ''}
        </div>

        <div style="text-align: center; background: rgba(255,153,51,0.08); padding: 16px; border-radius: 12px; border: 1px dashed rgba(255,153,51,0.3);">
          <p style="color: #ffffff; font-size: 13px; margin: 0 0 6px 0; font-weight: bold;">
            Happy Independence Day from HITian Inside!
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

  return await dispatchEmail({
    toEmail,
    toName,
    subject: `Submission Acknowledged: ${eventTitle} ${domainTitle ? `- ${domainTitle}` : ''} [Ticket: ${ticketId}]`,
    htmlContent
  });
}
