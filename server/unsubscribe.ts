import crypto from "crypto";

const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET || process.env.SESSION_SECRET || "unsubscribe-fallback-secret";

export function generateUnsubscribeToken(contactId: string, tenantId: string, campaignId: string): string {
  const data = `${contactId}:${tenantId}:${campaignId}`;
  const hmac = crypto.createHmac("sha256", UNSUBSCRIBE_SECRET);
  hmac.update(data);
  return hmac.digest("hex");
}

export function verifyUnsubscribeToken(token: string, contactId: string, tenantId: string, campaignId: string): boolean {
  const expected = generateUnsubscribeToken(contactId, tenantId, campaignId);
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

export function buildUnsubscribeUrl(baseUrl: string, contactId: string, tenantId: string, campaignId: string): string {
  const token = generateUnsubscribeToken(contactId, tenantId, campaignId);
  return `${baseUrl}/unsubscribe?t=${token}&tenant=${tenantId}&contact=${contactId}&c=${campaignId}`;
}
