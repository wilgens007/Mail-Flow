import { storage } from "./storage";
import { sendEmail, getSESFromEmail } from "./ses-service";
import { buildUnsubscribeUrl } from "./unsubscribe";
import { checkAndResetMonthlyUsage } from "./plan-limits";

let processorInterval: NodeJS.Timeout | null = null;

export function startEmailProcessor() {
  if (processorInterval) return;
  console.log("Starting email queue processor...");
  processorInterval = setInterval(async () => {
    try {
      await processEmailQueue();
    } catch (error) {
      console.error("Error processing email queue:", error);
    }
  }, 5000);
}

export function stopEmailProcessor() {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
    console.log("Email queue processor stopped.");
  }
}

async function processEmailQueue() {
  const claimedSends = await storage.claimQueuedSends(10);
  if (claimedSends.length === 0) return;

  console.log(`Processing ${claimedSends.length} queued emails...`);

  const processedCampaignIds = new Set<string>();

  for (const send of claimedSends) {
    processedCampaignIds.add(send.campaignId);

    try {
      const contact = await storage.getContact(send.contactId);
      if (!contact) {
        await storage.updateCampaignSend(send.id, { status: "failed", lastError: "Contact not found" });
        continue;
      }

      const campaign = await storage.getCampaign(send.campaignId);
      if (!campaign) {
        await storage.updateCampaignSend(send.id, { status: "failed", lastError: "Campaign not found" });
        continue;
      }

      if (contact.unsubscribed) {
        await storage.updateCampaignSend(send.id, { status: "unsubscribed", lastError: "Contact unsubscribed" });
        continue;
      }

      const suppression = await storage.getSuppression(send.tenantId, contact.email);
      if (suppression) {
        await storage.updateCampaignSend(send.id, { status: "failed", lastError: `Suppressed: ${suppression.reason}` });
        continue;
      }

      const tenant = await storage.getTenant(send.tenantId);
      if (!tenant) {
        await storage.updateCampaignSend(send.id, { status: "failed", lastError: "Tenant not found" });
        continue;
      }

      await checkAndResetMonthlyUsage(send.tenantId);

      const appUrl = process.env.APP_URL || "http://localhost:5000";
      const unsubscribeUrl = buildUnsubscribeUrl(appUrl, send.contactId, send.tenantId, send.campaignId);

      let htmlBody = campaign.htmlContent || "";
      htmlBody = htmlBody.replace(/\{\{unsubscribeUrl\}\}/g, unsubscribeUrl);
      htmlBody = htmlBody.replace(/\{\{firstName\}\}/g, contact.firstName || "");
      htmlBody = htmlBody.replace(/\{\{lastName\}\}/g, contact.lastName || "");
      htmlBody = htmlBody.replace(/\{\{companyAddress\}\}/g, tenant.companyAddress || "");

      const fromName = tenant.sendingFromName || tenant.name;
      const fromEmail = tenant.defaultFromEmail || getSESFromEmail();
      const fromHeader = fromName ? `${fromName} <${fromEmail}>` : fromEmail;

      const result = await sendEmail({
        to: contact.email,
        from: fromHeader,
        replyTo: tenant.replyToEmail || undefined,
        subject: campaign.subject || "",
        htmlBody,
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });

      await storage.updateCampaignSend(send.id, {
        status: "sent",
        sentAt: new Date(),
        messageId: result.messageId,
      });
      await storage.incrementEmailCount(send.tenantId, 1);

      await storage.createEventLog({
        tenantId: send.tenantId,
        type: "email_sent",
        payload: {
          campaignId: send.campaignId,
          contactId: send.contactId,
          email: contact.email,
          messageId: result.messageId,
          simulated: result.simulated,
        },
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const currentAttempts = (send.attempts || 0) + 1;

      if (currentAttempts < 3) {
        await storage.updateCampaignSend(send.id, {
          status: "queued",
          lastError: errorMessage,
          attempts: currentAttempts,
        });
        console.warn(`Send ${send.id} failed attempt ${currentAttempts}/3, re-queued: ${errorMessage}`);
      } else {
        await storage.updateCampaignSend(send.id, {
          status: "failed",
          lastError: errorMessage,
          attempts: currentAttempts,
        });
        console.error(`Send ${send.id} permanently failed after ${currentAttempts} attempts: ${errorMessage}`);
      }
    }
  }

  for (const campaignId of Array.from(processedCampaignIds)) {
    try {
      const campaign = await storage.getCampaign(campaignId);
      if (campaign && campaign.status === "sending") {
        const stats = await storage.getCampaignSendStats(campaignId);
        const totalProcessed = stats.delivered + stats.bounced + stats.complained;

        if (campaign.totalRecipients && totalProcessed >= campaign.totalRecipients) {
          await storage.updateCampaign(campaignId, {
            status: "sent",
            delivered: stats.delivered,
            bounced: stats.bounced,
            complained: stats.complained,
          });

          await storage.createEventLog({
            tenantId: campaign.tenantId,
            type: "campaign_completed",
            payload: {
              campaignId: campaign.id,
              delivered: stats.delivered,
              bounced: stats.bounced,
              complained: stats.complained,
            },
          });
        }
      }
    } catch (error) {
      console.error(`Failed to update campaign ${campaignId} status:`, error);
    }
  }
}

export async function handleBounce(messageId: string, email: string, bounceType: string) {
  console.log(`Handling bounce for ${email}: ${bounceType}`);
}

export async function handleComplaint(messageId: string, email: string) {
  console.log(`Handling complaint for ${email}`);
}
