import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

let sesClient: SESClient | null = null;

function getSESClient(): SESClient | null {
  if (sesClient) return sesClient;
  
  const region = process.env.AWS_REGION;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  
  if (!region || !accessKeyId || !secretAccessKey) {
    return null;
  }
  
  sesClient = new SESClient({
    region,
    credentials: { accessKeyId, secretAccessKey },
  });
  return sesClient;
}

export function isSESConfigured(): boolean {
  return !!(process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
}

export function getSESFromEmail(): string {
  return process.env.SES_FROM_EMAIL || "noreply@mailflow.io";
}

interface SendEmailParams {
  to: string;
  from: string;
  replyTo?: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  headers?: Record<string, string>;
}

export async function sendEmail(params: SendEmailParams): Promise<{ messageId: string; simulated: boolean }> {
  const client = getSESClient();
  
  if (!client) {
    await new Promise(resolve => setTimeout(resolve, 50));
    const simulated = Math.random() > 0.02;
    if (!simulated) {
      throw new Error("Simulated bounce");
    }
    return { 
      messageId: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, 
      simulated: true 
    };
  }
  
  const command = new SendEmailCommand({
    Destination: {
      ToAddresses: [params.to],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: params.htmlBody,
        },
        ...(params.textBody
          ? {
              Text: {
                Charset: "UTF-8",
                Data: params.textBody,
              },
            }
          : {}),
      },
      Subject: {
        Charset: "UTF-8",
        Data: params.subject,
      },
    },
    Source: params.from,
    ReplyToAddresses: params.replyTo ? [params.replyTo] : undefined,
  });
  
  const response = await client.send(command);
  return { 
    messageId: response.MessageId || `ses_${Date.now()}`, 
    simulated: false 
  };
}

export async function sendPasswordResetEmail(to: string, resetUrl: string, fromEmail?: string): Promise<void> {
  await sendEmail({
    to,
    from: fromEmail || getSESFromEmail(),
    subject: "Reset Your Password - MailFlow",
    textBody: `You requested a password reset for your MailFlow account.\n\nReset your password here: ${resetUrl}\n\nThis link expires in 60 minutes. If you didn't request this, you can safely ignore this email.`,
    htmlBody: `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background: #f4f4f7;">
  <div style="background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
      <h1 style="color: #ffffff; margin: 0; font-size: 24px;">Password Reset</h1>
    </div>
    <div style="padding: 32px;">
      <p>You requested a password reset for your MailFlow account.</p>
      <p>Click the button below to set a new password. This link expires in 60 minutes.</p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" style="display: inline-block; background: #6366f1; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset Password</a>
      </div>
      <p style="font-size: 14px; color: #6b7280;">If you didn't request this, you can safely ignore this email.</p>
      <p style="font-size: 12px; color: #9ca3af; margin-top: 24px; border-top: 1px solid #e5e7eb; padding-top: 16px;">
        If the button doesn't work, copy and paste this link into your browser:<br>
        <a href="${resetUrl}" style="color: #6366f1; word-break: break-all;">${resetUrl}</a>
      </p>
    </div>
  </div>
</body>
</html>`,
  });
}
