import type { Express, Request, Response } from "express";
import express from "express";
import crypto from "crypto";
import { handleBounce, handleComplaint } from "./email-processor";

/**
 * Receives Amazon SNS notifications for SES bounce/complaint events.
 * Configure in AWS: SES -> SNS topic -> HTTPS subscription to
 * POST {APP_URL}/api/webhooks/ses
 *
 * SNS posts with Content-Type: text/plain, so this route uses a text
 * body parser and JSON-parses manually.
 */

// Cache fetched signing certs by URL
const certCache = new Map<string, string>();

function isValidCertUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      /^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/.test(parsed.hostname)
    );
  } catch {
    return false;
  }
}

async function getSigningCert(certUrl: string): Promise<string> {
  const cached = certCache.get(certUrl);
  if (cached) return cached;
  const res = await fetch(certUrl);
  if (!res.ok) throw new Error(`Failed to fetch signing cert: ${res.status}`);
  const cert = await res.text();
  certCache.set(certUrl, cert);
  return cert;
}

function buildStringToSign(msg: any): string {
  // Per AWS docs: fields in fixed order, each followed by \n
  const fields =
    msg.Type === "Notification"
      ? ["Message", "MessageId", msg.Subject ? "Subject" : null, "Timestamp", "TopicArn", "Type"]
      : ["Message", "MessageId", "SubscribeURL", "Timestamp", "Token", "TopicArn", "Type"];
  let str = "";
  for (const f of fields) {
    if (!f) continue;
    str += f + "\n" + msg[f] + "\n";
  }
  return str;
}

async function verifySnsSignature(msg: any): Promise<boolean> {
  try {
    const certUrl = msg.SigningCertURL;
    if (!certUrl || !isValidCertUrl(certUrl)) return false;
    if (msg.SignatureVersion !== "1") return false;
    const cert = await getSigningCert(certUrl);
    const stringToSign = buildStringToSign(msg);
    const verifier = crypto.createVerify("RSA-SHA1");
    verifier.update(stringToSign, "utf8");
    return verifier.verify(cert, msg.Signature, "base64");
  } catch (err) {
    console.error("[SES-WEBHOOK] Signature verification error:", err);
    return false;
  }
}

export function registerSesWebhook(app: Express) {
  app.post(
    "/api/webhooks/ses",
    express.text({ type: "*/*", limit: "1mb" }),
    async (req: Request, res: Response) => {
      let msg: any;
      try {
        msg = JSON.parse(req.body);
      } catch {
        return res.status(400).json({ error: "Invalid JSON" });
      }

      // Confirm new subscriptions automatically (validates the URL host first)
      if (msg.Type === "SubscriptionConfirmation") {
        const subscribeUrl: string = msg.SubscribeURL || "";
        let hostOk = false;
        try {
          const u = new URL(subscribeUrl);
          hostOk = u.protocol === "https:" && /^sns\.[a-z0-9-]+\.amazonaws\.com(\.cn)?$/.test(u.hostname);
        } catch {
          hostOk = false;
        }
        if (!hostOk) {
          return res.status(400).json({ error: "Invalid SubscribeURL" });
        }
        console.log("[SES-WEBHOOK] Confirming SNS subscription...");
        try {
          await fetch(subscribeUrl);
          console.log("[SES-WEBHOOK] Subscription confirmed.");
        } catch (err) {
          console.error("[SES-WEBHOOK] Subscription confirmation failed:", err);
        }
        return res.json({ ok: true });
      }

      if (msg.Type !== "Notification") {
        return res.json({ ok: true, ignored: msg.Type });
      }

      const valid = await verifySnsSignature(msg);
      if (!valid) {
        console.warn("[SES-WEBHOOK] Invalid SNS signature, rejecting.");
        return res.status(403).json({ error: "Invalid signature" });
      }

      let notification: any;
      try {
        notification = JSON.parse(msg.Message);
      } catch {
        return res.status(400).json({ error: "Invalid notification payload" });
      }

      try {
        if (notification.notificationType === "Bounce") {
          const bounce = notification.bounce;
          const bounceType = bounce?.bounceType || "Undetermined";
          for (const recipient of bounce?.bouncedRecipients || []) {
            await handleBounce(
              notification.mail?.messageId || "",
              recipient.emailAddress,
              bounceType + (bounce?.bounceSubType ? `/${bounce.bounceSubType}` : "")
            );
          }
        } else if (notification.notificationType === "Complaint") {
          const complaint = notification.complaint;
          for (const recipient of complaint?.complainedRecipients || []) {
            await handleComplaint(notification.mail?.messageId || "", recipient.emailAddress);
          }
        } else if (notification.notificationType === "Delivery") {
          // Delivery confirmations are informational; sends are already marked "sent"
          console.log("[SES-WEBHOOK] Delivery confirmed:", notification.mail?.messageId);
        }
      } catch (err) {
        console.error("[SES-WEBHOOK] Error handling notification:", err);
      }

      res.json({ ok: true });
    }
  );
}
