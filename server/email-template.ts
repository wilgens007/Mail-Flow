export interface SimpleEmailContent {
  title: string;
  body: string;
  buttonText?: string;
  buttonUrl?: string;
  imageUrl?: string;
}

export function generateHtmlFromJson(content: SimpleEmailContent, tenantInfo?: { companyAddress?: string; tenantId?: string }): string {
  const { title, body, buttonText, buttonUrl, imageUrl } = content;
  const companyAddress = tenantInfo?.companyAddress || "";
  const tenantId = tenantInfo?.tenantId || "";

  const imageBlock = imageUrl ? `
    <tr>
      <td style="padding: 0 0 24px 0;">
        <img src="${escapeHtml(imageUrl)}" alt="" style="max-width: 100%; height: auto; display: block; border-radius: 8px;" />
      </td>
    </tr>` : "";

  const buttonBlock = (buttonText && buttonUrl) ? `
    <tr>
      <td style="padding: 24px 0;" align="center">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
          <tr>
            <td style="border-radius: 6px; background-color: #6366f1;">
              <a href="${escapeHtml(buttonUrl)}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px;">
                ${escapeHtml(buttonText)}
              </a>
            </td>
          </tr>
        </table>
      </td>
    </tr>` : "";

  const unsubscribeUrl = `{{unsubscribeUrl}}`;

  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(title)}</title>
  <style type="text/css">
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
    @media only screen and (max-width: 620px) {
      .email-container { width: 100% !important; max-width: 100% !important; }
      .fluid { max-width: 100% !important; height: auto !important; }
      .stack-column { display: block !important; width: 100% !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f4f4f7;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" class="email-container" style="max-width: 600px; width: 100%;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 40px 32px; border-radius: 12px 12px 0 0; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; line-height: 1.3;">
                ${escapeHtml(title)}
              </h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                ${imageBlock}
                <tr>
                  <td style="font-size: 16px; line-height: 1.6; color: #374151;">
                    ${body}
                  </td>
                </tr>
                ${buttonBlock}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                ${companyAddress ? `<tr>
                  <td style="font-size: 12px; line-height: 1.5; color: #9ca3af; text-align: center; padding-bottom: 8px;">
                    ${escapeHtml(companyAddress)}
                  </td>
                </tr>` : ""}
                <tr>
                  <td style="font-size: 12px; line-height: 1.5; color: #9ca3af; text-align: center;">
                    <a href="${unsubscribeUrl}" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
