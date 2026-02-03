import { storage } from "./storage";

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
  const queuedSends = await storage.getQueuedSends(10);
  
  if (queuedSends.length === 0) return;
  
  console.log(`Processing ${queuedSends.length} queued emails...`);
  
  for (const send of queuedSends) {
    try {
      const contact = await storage.getContact(send.contactId);
      if (!contact) {
        await storage.updateCampaignSend(send.id, { status: "failed" });
        continue;
      }

      const suppression = await storage.getSuppression(contact.tenantId, contact.email);
      if (suppression) {
        await storage.updateCampaignSend(send.id, { status: "failed" });
        continue;
      }

      const success = await simulateSendEmail(contact.email);
      
      if (success) {
        await storage.updateCampaignSend(send.id, { 
          status: "sent",
          sentAt: new Date()
        });
        await storage.incrementEmailCount(contact.tenantId, 1);
        
        await storage.createEventLog({
          tenantId: contact.tenantId,
          type: "email_sent",
          payload: { 
            campaignId: send.campaignId, 
            contactId: send.contactId,
            email: contact.email 
          },
        });
      } else {
        await storage.updateCampaignSend(send.id, { status: "failed" });
      }
    } catch (error) {
      console.error(`Failed to process send ${send.id}:`, error);
      await storage.updateCampaignSend(send.id, { status: "failed" });
    }
  }

  for (const send of queuedSends) {
    const campaign = await storage.getCampaign(send.campaignId);
    if (campaign && campaign.status === "sending") {
      const stats = await storage.getCampaignSendStats(send.campaignId);
      const totalProcessed = stats.delivered + stats.bounced + stats.complained;
      
      if (campaign.totalRecipients && totalProcessed >= campaign.totalRecipients) {
        await storage.updateCampaign(send.campaignId, {
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
  }
}

async function simulateSendEmail(email: string): Promise<boolean> {
  await new Promise(resolve => setTimeout(resolve, 100));
  return Math.random() > 0.02;
}

export async function handleBounce(messageId: string, email: string, bounceType: string) {
  console.log(`Handling bounce for ${email}: ${bounceType}`);
  
}

export async function handleComplaint(messageId: string, email: string) {
  console.log(`Handling complaint for ${email}`);
}
