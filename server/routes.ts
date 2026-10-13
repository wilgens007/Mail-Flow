import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import Stripe from "stripe";
import crypto from "crypto";
import multer from "multer";
import Papa from "papaparse";
import { storage } from "./storage";
import { 
  hashPassword, verifyPassword, generateToken, 
  authMiddleware, adminMiddleware, tenantMiddleware,
  type AuthRequest 
} from "./auth";
import { loginSchema, signupSchema, PLAN_LIMITS, assertCanSend, type PlanKey } from "@shared/schema";
import { sendPasswordResetEmail, getSESFromEmail, isSESConfigured } from "./ses-service";
import { verifyUnsubscribeToken, buildUnsubscribeUrl } from "./unsubscribe";
import { checkAndResetMonthlyUsage, getTenantPlan } from "./plan-limits";
import { generateHtmlFromJson, type SimpleEmailContent } from "./email-template";
import { getTrackingPixel } from "./tracking";
import { registerSesWebhook } from "./ses-webhook";
import { z } from "zod";

const upload = multer({ storage: multer.memoryStorage() });

function getStripe(): Stripe | null {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Stripe webhook - uses raw body for signature verification
  app.post("/api/stripe/webhook", async (req, res) => {
    const stripe = getStripe();
    if (!stripe) {
      return res.status(400).json({ message: "Stripe not configured" });
    }
    
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (!sig || !webhookSecret) {
      return res.status(400).json({ message: "Missing signature or webhook secret" });
    }
    
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(req.rawBody as Buffer, sig, webhookSecret);
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).json({ message: "Webhook signature verification failed" });
    }
    
    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const tenantId = session.metadata?.tenantId;
          const plan = session.metadata?.plan as PlanKey;
          if (tenantId && plan) {
            const subscription = await storage.getSubscription(tenantId);
            if (subscription) {
              await storage.updateSubscription(subscription.id, {
                stripeCustomerId: session.customer as string,
                stripeSubscriptionId: session.subscription as string,
                plan,
                status: "active",
              });
            }
            await storage.updateTenant(tenantId, {
              stripeCustomerId: session.customer as string,
            });
            await storage.createSubscriptionEvent({
              tenantId,
              stripeEventId: event.id,
              eventType: event.type,
              plan,
              status: "active",
              payload: { sessionId: session.id },
            });
          }
          break;
        }
        
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
          const sub = event.data.object as Stripe.Subscription;
          const existingSub = await storage.getSubscriptionByStripeId(sub.id);
          if (existingSub) {
            const status = sub.status === "active" ? "active" : sub.status === "past_due" ? "past_due" : "canceled";
            const priceId = sub.items?.data[0]?.price?.id;
            let plan: PlanKey | undefined;
            if (priceId) {
              if (priceId === process.env.STRIPE_PRICE_STARTER) plan = "starter";
              else if (priceId === process.env.STRIPE_PRICE_PRO) plan = "pro";
              else if (priceId === process.env.STRIPE_PRICE_BUSINESS) plan = "agency";
            }
            
            await storage.updateSubscription(existingSub.id, {
              status: status as any,
              plan: plan || existingSub.plan,
              currentPeriodStart: sub.current_period_start ? new Date((sub as any).current_period_start * 1000) : undefined,
              currentPeriodEnd: sub.current_period_end ? new Date((sub as any).current_period_end * 1000) : undefined,
            });
            
            await storage.createSubscriptionEvent({
              tenantId: existingSub.tenantId,
              stripeEventId: event.id,
              eventType: event.type,
              plan: plan || existingSub.plan,
              status,
              payload: { subscriptionId: sub.id },
            });
          }
          break;
        }
        
        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;
          const sub = await storage.getSubscriptionByStripeCustomerId(customerId);
          if (sub) {
            await storage.updateSubscription(sub.id, { status: "past_due" });
            await storage.createSubscriptionEvent({
              tenantId: sub.tenantId,
              stripeEventId: event.id,
              eventType: event.type,
              status: "past_due",
              payload: { invoiceId: invoice.id },
            });
          }
          break;
        }
      }
      
      res.json({ received: true });
    } catch (error) {
      console.error("Webhook handler error:", error);
      res.status(500).json({ message: "Webhook handler error" });
    }
  });
  
  // Auth routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const data = signupSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const tenant = await storage.createTenant({
        name: data.companyName,
        status: "active",
      });

      await storage.createSubscription({
        tenantId: tenant.id,
        plan: "starter",
        status: "active",
      });

      const passwordHash = await hashPassword(data.password);
      const user = await storage.createUser({
        email: data.email,
        passwordHash,
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        tenantId: tenant.id,
        role: "user",
      });

      const token = generateToken(user.id);
      const subscription = await storage.getSubscription(tenant.id);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId,
          tenant,
          subscription,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const data = loginSchema.parse(req.body);
      
      const user = await storage.getUserByEmail(data.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const valid = await verifyPassword(data.password, user.passwordHash);
      if (!valid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const tenant = user.tenantId ? await storage.getTenant(user.tenantId) : null;
      
      if (tenant?.status === "disabled") {
        return res.status(403).json({ message: "Account has been disabled" });
      }

      const subscription = user.tenantId ? await storage.getSubscription(user.tenantId) : null;
      const token = generateToken(user.id);

      res.json({
        token,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId,
          tenant,
          subscription,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: error.errors[0].message });
      }
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const user = req.user!;
      const tenant = user.tenantId ? await storage.getTenant(user.tenantId) : null;
      const subscription = user.tenantId ? await storage.getSubscription(user.tenantId) : null;

      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          tenantId: user.tenantId,
          tenant,
          subscription,
        },
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Password reset - Forgot password
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }
      
      const successMessage = "If that email exists, we sent a password reset link.";
      
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ message: successMessage });
      }
      
      const recentRequests = await storage.getRecentPasswordResetRequests(user.id, 15);
      if (recentRequests >= 3) {
        return res.json({ message: successMessage });
      }
      
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      
      await storage.createPasswordResetToken({
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      });
      
      const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
      const resetUrl = `${appUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;
      
      try {
        await sendPasswordResetEmail(email, resetUrl);
      } catch (err) {
        console.error("Failed to send password reset email:", err);
      }
      
      res.json({ message: successMessage });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  // Password reset - Reset password
  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, email, newPassword } = req.body;
      if (!token || !email || !newPassword) {
        return res.status(400).json({ message: "Token, email, and new password are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }
      
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const resetToken = await storage.getPasswordResetToken(tokenHash);
      
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset link" });
      }
      
      if (resetToken.usedAt) {
        return res.status(400).json({ message: "This reset link has already been used" });
      }
      
      if (new Date() > new Date(resetToken.expiresAt)) {
        return res.status(400).json({ message: "This reset link has expired" });
      }
      
      const user = await storage.getUser(resetToken.userId);
      if (!user || user.email !== email) {
        return res.status(400).json({ message: "Invalid reset link" });
      }
      
      const passwordHash = await hashPassword(newPassword);
      await storage.updateUser(user.id, { passwordHash });
      await storage.markPasswordResetTokenUsed(resetToken.id);
      
      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Change password (authenticated)
  app.post("/api/auth/change-password", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ message: "Current password and new password are required" });
      }
      
      if (newPassword.length < 6) {
        return res.status(400).json({ message: "New password must be at least 6 characters" });
      }
      
      const valid = await verifyPassword(currentPassword, req.user!.passwordHash);
      if (!valid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      
      const passwordHash = await hashPassword(newPassword);
      await storage.updateUser(req.user!.id, { passwordHash });
      
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error("Change password error:", error);
      res.status(500).json({ message: "Failed to change password" });
    }
  });

  // User profile
  app.patch("/api/users/profile", authMiddleware, async (req: AuthRequest, res) => {
    try {
      const { firstName, lastName } = req.body;
      const updated = await storage.updateUser(req.user!.id, { firstName, lastName });
      res.json(updated);
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Tenant settings
  app.patch("/api/tenants/settings", authMiddleware, tenantMiddleware, async (req: AuthRequest, res) => {
    try {
      const { name, sendingFromName, defaultFromEmail, replyToEmail, companyAddress } = req.body;
      const updated = await storage.updateTenant(req.tenantId!, { 
        name, sendingFromName, defaultFromEmail, replyToEmail, companyAddress 
      });
      res.json(updated);
    } catch (error) {
      console.error("Update tenant error:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
  });

  // SES configuration status
  app.get("/api/settings/email-status", authMiddleware, tenantMiddleware, async (req: AuthRequest, res) => {
    res.json({
      sesConfigured: isSESConfigured(),
      fromEmail: getSESFromEmail(),
    });
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", authMiddleware, tenantMiddleware, async (req: AuthRequest, res) => {
    try {
      const tenantId = req.tenantId!;
      const stats = await storage.getTenantStats(tenantId);
      const tenant = await storage.getTenant(tenantId);
      const subscription = await storage.getSubscription(tenantId);
      const campaigns = await storage.getCampaigns(tenantId);
      const contacts = await storage.getContacts(tenantId);
      
      const plan = subscription?.plan || "starter";
      const planInfo = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];

      res.json({
        ...stats,
        emailsSentThisMonth: tenant?.emailsSentThisMonth || 0,
        emailLimit: planInfo.emailsPerMonth,
        recentCampaigns: campaigns.slice(0, 5),
        recentContacts: contacts.slice(0, 5),
      });
    } catch (error) {
      console.error("Dashboard stats error:", error);
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  // Contacts
  app.get("/api/contacts", authMiddleware, tenantMiddleware, async (req: AuthRequest, res) => {
    try {
      const contacts = await storage.getContacts(req.tenantId!);
      res.json(contacts);
    } catch (error) {
      console.error("Get contacts error:", error);
      res.status(500).json({ message: "Failed to get contacts" });
    }
  });

  app.post("/api/contacts", authMiddleware, tenantMiddleware, async (req: AuthRequest, res) => {
    try {
      const { email, firstName, lastName, tags } = req.body;
      
      const existing = await storage.getContactByEmail(req.tenantId!, email);
      if (existing) {
        return res.status(400).json({ message: "Contact with this email already exists" });
      }

      const contact = await storage.createContact({
        tenantId: req.tenantId!,
        email,
        firstName: firstName || "",
        lastName: lastName || "",
        tags: tags || [],
        unsubscribed: false,
      });

      res.json(contact);
    } catch (error) {
      console.error("Create contact error:", error);
      res.status(500).json({ message: "Failed to create contact" });
    }
  });

  app.post("/api/contacts/upload", authMiddleware, tenantMiddleware, upload.single("file"), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const csv = req.file.buffer.toString("utf-8");
      const result = Papa.parse(csv, { header: true, skipEmptyLines: true });
      
      if (result.errors.length > 0) {
        return res.status(400).json({ message: "Invalid CSV format" });
      }

      const rows = result.data as Record<string, string>[];
      let imported = 0;
      let skipped = 0;

      for (const row of rows) {
        const email = row.email || row.Email || row.EMAIL;
        if (!email || !email.includes("@")) {
          skipped++;
          continue;
        }

        const existing = await storage.getContactByEmail(req.tenantId!, email);
        if (existing) {
          skipped++;
          continue;
        }

        const tagsStr = row.tags || row.Tags || row.TAGS || "";
        const tags = tagsStr ? tagsStr.split(",").map(t => t.trim()).filter(Boolean) : [];

        await storage.createContact({
          tenantId: req.tenantId!,
          email: email.trim().toLowerCase(),
          firstName: row.first_name || row.firstName || row.FirstName || "",
          lastName: row.last_name || row.lastName || row.LastName || "",
          tags,
          unsubscribed: false,
        });
        imported++;
      }

      res.json({ imported, skipped });
    } catch (error) {
      console.error("Upload contacts error:", error);
      res.status(500).json({ message: "Failed to upload contacts" });
    }
  });

  app.post("/api/contacts/bulk-delete", authMiddleware, tenantMiddleware, async (req: AuthRequest, res) => {
    try {
      const { ids } = req.body;
      const deleted = await storage.deleteContacts(ids);
      res.json({ deleted });
    } catch (error) {
      console.error("Delete contacts error:", error);
      res.status(500).json({ message: "Failed to delete contacts" });
    }
  });

  // Campaigns
  app.get("/api/campaigns", authMiddleware, tenantMiddleware, async (req: AuthRequest, res) => {
    try {
      const campaigns = await storage.getCampaigns(req.tenantId!);
      res.json(campaigns);
    } catch (error) {
      console.error("Get campaigns error:", error);
      res.status(500).json({ message: "Failed to get campaigns" });
    }
  });

  app.get("/api/campaigns/:id", authMiddleware, tenantMiddleware, async (req: AuthRequest, res) => {
    try {
      const campaign = await storage.getCampaignForTenant(req.params.id, req.tenantId!);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      console.error("Get campaign error:", error);
      res.status(500).json({ message: "Failed to get campaign" });
    }
  });

  app.post("/api/campaigns", authMiddleware, tenantMiddleware, async (req: AuthRequest, res) => {
    try {
      const { name, subject, htmlContent, contentJson, editorMode, status, scheduledAt } = req.body;
      const campaign = await storage.createCampaign({
        tenantId: req.tenantId!,
        name,
        subject: subject || "",
        htmlContent: htmlContent || "",
        contentJson: contentJson || null,
        editorMode: editorMode || "html",
        status: status || "draft",
        scheduledAt: scheduledAt ? new Date(scheduledAt) : null,
      });
      res.json(campaign);
    } catch (error) {
      console.error("Create campaign error:", error);
      res.status(500).json({ message: "Failed to create campaign" });
    }
  });

  app.patch("/api/campaigns/:id", authMiddleware, tenantMiddleware, async (req: AuthRequest, res) => {
    try {
      const campaign = await storage.getCampaignForTenant(req.params.id, req.tenantId!);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      const { name, subject, htmlContent, contentJson, editorMode, status, scheduledAt } = req.body;
      const updated = await storage.updateCampaign(req.params.id, {
        name: name ?? campaign.name,
        subject: subject ?? campaign.subject,
        htmlContent: htmlContent ?? campaign.htmlContent,
        contentJson: contentJson !== undefined ? contentJson : campaign.contentJson,
        editorMode: editorMode ?? campaign.editorMode,
        status: status ?? campaign.status,
        scheduledAt: scheduledAt ? new Date(scheduledAt) : campaign.scheduledAt,
      });

      res.json(updated);
    } catch (error) {
      console.error("Update campaign error:", error);
      res.status(500).json({ message: "Failed to update campaign" });
    }
  });

  app.delete("/api/campaigns/:id", authMiddleware, tenantMiddleware, async (req: AuthRequest, res) => {
    try {
      const campaign = await storage.getCampaignForTenant(req.params.id, req.tenantId!);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      await storage.deleteCampaign(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete campaign error:", error);
      res.status(500).json({ message: "Failed to delete campaign" });
    }
  });

  app.post("/api/campaigns/:id/duplicate", authMiddleware, tenantMiddleware, async (req: AuthRequest, res) => {
    try {
      const campaign = await storage.getCampaignForTenant(req.params.id, req.tenantId!);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      const duplicate = await storage.createCampaign({
        tenantId: req.tenantId!,
        name: `${campaign.name} (Copy)`,
        subject: campaign.subject || "",
        htmlContent: campaign.htmlContent || "",
        contentJson: campaign.contentJson || null,
        editorMode: campaign.editorMode || "html",
        status: "draft",
        scheduledAt: null,
      });

      res.json(duplicate);
    } catch (error) {
      console.error("Duplicate campaign error:", error);
      res.status(500).json({ message: "Failed to duplicate campaign" });
    }
  });

  app.post("/api/campaigns/:id/send", authMiddleware, tenantMiddleware, async (req: AuthRequest, res) => {
    try {
      const campaign = await storage.getCampaignForTenant(req.params.id, req.tenantId!);
      if (!campaign) {
        return res.status(404).json({ message: "Campaign not found" });
      }

      if (campaign.status !== "draft") {
        return res.status(400).json({ message: "Campaign has already been sent" });
      }

      if ((campaign as any).editorMode === "simple" && (campaign as any).contentJson) {
        const tenant = await storage.getTenant(req.tenantId!);
        const generatedHtml = generateHtmlFromJson(
          (campaign as any).contentJson as SimpleEmailContent,
          { companyAddress: tenant?.companyAddress || "", tenantId: req.tenantId! }
        );
        await storage.updateCampaign(campaign.id, { htmlContent: generatedHtml });
      }

      const { sendToAll, tags } = req.body;
      
      let contacts: Awaited<ReturnType<typeof storage.getActiveContacts>>;
      if (sendToAll) {
        contacts = await storage.getActiveContacts(req.tenantId!);
      } else {
        contacts = await storage.getContactsByTags(req.tenantId!, tags || []);
      }

      const suppressions = await storage.getSuppressions(req.tenantId!);
      const suppressedEmails = new Set(suppressions.map(s => s.email.toLowerCase()));
      contacts = contacts.filter(c => !suppressedEmails.has(c.email.toLowerCase()));

      if (contacts.length === 0) {
        return res.status(400).json({ message: "No eligible recipients" });
      }

      const subscription = await storage.getSubscription(req.tenantId!);

      await checkAndResetMonthlyUsage(req.tenantId!);
      const freshTenant = await storage.getTenant(req.tenantId!);
      const plan = (subscription?.plan || "starter") as PlanKey;
      const canSend = assertCanSend(freshTenant?.emailsSentThisMonth || 0, contacts.length, plan);
      if (!canSend.allowed) {
        return res.status(400).json({ message: canSend.message });
      }

      const sends = contacts.map(contact => ({
        tenantId: req.tenantId!,
        campaignId: campaign.id,
        contactId: contact.id,
        status: "queued" as const,
        attempts: 0,
      }));

      await storage.createCampaignSends(sends);

      await storage.updateCampaign(campaign.id, {
        status: "sending",
        sentAt: new Date(),
        totalRecipients: contacts.length,
      });

      await storage.createEventLog({
        tenantId: req.tenantId!,
        type: "campaign_send_started",
        payload: { campaignId: campaign.id, recipientCount: contacts.length },
      });

      res.json({ success: true, recipientCount: contacts.length });
    } catch (error) {
      console.error("Send campaign error:", error);
      res.status(500).json({ message: "Failed to send campaign" });
    }
  });

  // Analytics
  app.get("/api/analytics", authMiddleware, tenantMiddleware, async (req: AuthRequest, res) => {
    try {
      const days = parseInt(req.query.days as string) || 30;
      const stats = await storage.getEmailStats(req.tenantId!, days);
      const campaigns = await storage.getCampaigns(req.tenantId!);

      const topCampaigns = await Promise.all(
        campaigns
          .filter(c => c.status === "sent" || c.status === "sending")
          .slice(0, 5)
          .map(async (c) => {
            const sendStats = await storage.getCampaignSendStats(c.id);
            return { name: c.name, ...sendStats };
          })
      );

      const totalDelivered = topCampaigns.reduce((sum: number, c: any) => sum + (c.delivered || 0), 0);
      const totalOpened = topCampaigns.reduce((sum: number, c: any) => sum + (c.opened || 0), 0);
      const totalClicked = topCampaigns.reduce((sum: number, c: any) => sum + (c.clicked || 0), 0);
      res.json({
        emailsSent: stats.sent,
        emailsDelivered: stats.delivered,
        emailsBounced: stats.bounced,
        emailsComplained: stats.complained,
        deliveryRate: stats.sent > 0 ? Math.round((stats.delivered / stats.sent) * 100) : 0,
        openRate: totalDelivered > 0 ? Math.round((totalOpened / totalDelivered) * 1000) / 10 : 0,
        clickRate: totalDelivered > 0 ? Math.round((totalClicked / totalDelivered) * 1000) / 10 : 0,
        dailyStats: stats.dailyStats,
        topCampaigns,
      });
    } catch (error) {
      console.error("Analytics error:", error);
      res.status(500).json({ message: "Failed to get analytics" });
    }
  });

  // Billing
  app.post("/api/billing/create-checkout", authMiddleware, tenantMiddleware, async (req: AuthRequest, res) => {
    try {
      const stripe = getStripe();
      if (!stripe) {
        return res.status(400).json({ message: "Stripe is not configured. Please add STRIPE_SECRET_KEY." });
      }
      
      const { plan } = req.body;
      const priceMap: Record<string, string | undefined> = {
        starter: process.env.STRIPE_PRICE_STARTER,
        pro: process.env.STRIPE_PRICE_PRO,
        agency: process.env.STRIPE_PRICE_BUSINESS,
      };
      
      const priceId = priceMap[plan];
      if (!priceId) {
        return res.status(400).json({ message: "Invalid plan or price not configured" });
      }
      
      const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
      
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: `${appUrl}/dashboard/billing?success=true`,
        cancel_url: `${appUrl}/dashboard/billing?canceled=true`,
        metadata: {
          tenantId: req.tenantId!,
          plan,
        },
      });
      
      res.json({ url: session.url });
    } catch (error) {
      console.error("Create checkout error:", error);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  app.post("/api/billing/portal", authMiddleware, tenantMiddleware, async (req: AuthRequest, res) => {
    try {
      const stripe = getStripe();
      if (!stripe) {
        return res.status(400).json({ message: "Stripe is not configured. Please add STRIPE_SECRET_KEY." });
      }
      
      const tenant = await storage.getTenant(req.tenantId!);
      if (!tenant?.stripeCustomerId) {
        return res.status(400).json({ message: "No billing account found. Please subscribe to a plan first." });
      }
      
      const appUrl = process.env.APP_URL || `https://${req.headers.host}`;
      
      const portalSession = await stripe.billingPortal.sessions.create({
        customer: tenant.stripeCustomerId,
        return_url: `${appUrl}/dashboard/billing`,
      });
      
      res.json({ url: portalSession.url });
    } catch (error) {
      console.error("Billing portal error:", error);
      res.status(500).json({ message: "Failed to open billing portal" });
    }
  });

  // Admin routes
  app.get("/api/admin/tenants", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const allTenants = await storage.getAllTenants();
      
      const tenantsWithDetails = await Promise.all(
        allTenants.map(async (tenant) => {
          const stats = await storage.getTenantStats(tenant.id);
          const subscription = await storage.getSubscription(tenant.id);
          
          return {
            ...tenant,
            userCount: 1,
            contactCount: stats.totalContacts,
            plan: subscription?.plan || "starter",
          };
        })
      );

      res.json(tenantsWithDetails);
    } catch (error) {
      console.error("Admin get tenants error:", error);
      res.status(500).json({ message: "Failed to get tenants" });
    }
  });

  app.patch("/api/admin/tenants/:id/status", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const { status } = req.body;
      const updated = await storage.updateTenant(req.params.id, { status });
      
      await storage.createEventLog({
        tenantId: req.params.id,
        type: status === "disabled" ? "tenant_disabled" : "tenant_enabled",
        payload: { adminId: req.user!.id },
      });

      res.json(updated);
    } catch (error) {
      console.error("Admin update tenant status error:", error);
      res.status(500).json({ message: "Failed to update tenant status" });
    }
  });

  app.get("/api/admin/system/stats", authMiddleware, adminMiddleware, async (req: AuthRequest, res) => {
    try {
      const stats = await storage.getSystemStats();
      const recentEvents = await storage.getRecentEvents(10);

      const totalSent = stats.totalEmailsSent || 1;
      res.json({
        ...stats,
        deliveryRate: Math.round((stats.totalDelivered / totalSent) * 100),
        bounceRate: Math.round((stats.totalBounced / totalSent) * 100 * 10) / 10,
        complaintRate: Math.round((stats.totalComplaints / totalSent) * 100 * 100) / 100,
        recentEvents,
      });
    } catch (error) {
      console.error("Admin system stats error:", error);
      res.status(500).json({ message: "Failed to get system stats" });
    }
  });

  // Unsubscribe endpoint (public, HMAC-secured)
  app.get("/unsubscribe", async (req, res) => {
    try {
      const { t, tenant: tenantId, contact: contactId, c: campaignId } = req.query;
      
      if (!t || !tenantId || !contactId || !campaignId) {
        return res.status(400).send(renderUnsubscribePage("Invalid Link", "This unsubscribe link is invalid or incomplete.", null));
      }
      
      const isValid = verifyUnsubscribeToken(t as string, contactId as string, tenantId as string, campaignId as string);
      if (!isValid) {
        return res.status(400).send(renderUnsubscribePage("Invalid Link", "This unsubscribe link is invalid or has been tampered with.", null));
      }
      
      const contact = await storage.getContactForTenant(contactId as string, tenantId as string);
      const tenant = await storage.getTenant(tenantId as string);
      
      if (!contact) {
        return res.status(404).send(renderUnsubscribePage("Not Found", "Contact not found.", null));
      }
      
      if (!contact.unsubscribed) {
        await storage.updateContact(contact.id, { unsubscribed: true, unsubscribedAt: new Date() });
        
        const existing = await storage.getSuppression(tenantId as string, contact.email);
        if (!existing) {
          await storage.createSuppression({
            tenantId: tenantId as string,
            email: contact.email,
            reason: "unsubscribe",
          });
        }
      }
      
      res.send(renderUnsubscribePage(
        "Unsubscribed",
        "You have been successfully unsubscribed from this mailing list.",
        tenant
      ));
    } catch (error) {
      console.error("Unsubscribe error:", error);
      res.status(500).send(renderUnsubscribePage("Error", "Failed to process unsubscribe request.", null));
    }
  });

  // Open tracking pixel (public — sendId is an unguessable UUID)
  app.get("/t/o/:sendId", async (req, res) => {
    try {
      const send = await storage.getCampaignSend(req.params.sendId);
      if (send) {
        await storage.updateCampaignSend(send.id, {
          openedAt: send.openedAt || new Date(),
          openCount: (send.openCount || 0) + 1,
        } as any);
      }
    } catch (err) {
      console.error("Open tracking error:", err);
    }
    res.set({
      "Content-Type": "image/gif",
      "Content-Length": getTrackingPixel().length.toString(),
      "Cache-Control": "no-store, no-cache, must-revalidate",
    });
    res.send(getTrackingPixel());
  });

  // Click tracking redirect (public — sendId is an unguessable UUID)
  app.get("/t/c/:sendId", async (req, res) => {
    const target = req.query.u as string;
    if (!target || !/^https?:\/\//i.test(target)) {
      return res.status(400).send("Invalid redirect URL");
    }
    try {
      const send = await storage.getCampaignSend(req.params.sendId);
      if (send) {
        await storage.updateCampaignSend(send.id, {
          clickedAt: send.clickedAt || new Date(),
          clickCount: (send.clickCount || 0) + 1,
        } as any);
      }
    } catch (err) {
      console.error("Click tracking error:", err);
    }
    res.redirect(302, target);
  });

  // SES bounce/complaint webhook (SNS)
  registerSesWebhook(app);

  return httpServer;
}

function renderUnsubscribePage(title: string, message: string, tenant: any): string {
  const tenantInfo = tenant ? `
    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
      <p style="font-size: 13px; color: #9ca3af; margin: 0;">${escapeHtml(tenant.name)}</p>
      ${tenant.companyAddress ? `<p style="font-size: 12px; color: #9ca3af; margin: 4px 0 0 0;">${escapeHtml(tenant.companyAddress).replace(/\n/g, '<br>')}</p>` : ""}
      ${tenant.replyToEmail ? `<p style="font-size: 12px; color: #9ca3af; margin: 4px 0 0 0;">Contact: ${escapeHtml(tenant.replyToEmail)}</p>` : ""}
    </div>` : "";
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f7; margin: 0; padding: 40px 16px;">
  <div style="max-width: 440px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 48px 32px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
    <div style="width: 56px; height: 56px; background: ${title === "Unsubscribed" ? "#dcfce7" : "#fee2e2"}; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 20px;">
      <span style="font-size: 24px;">${title === "Unsubscribed" ? "&#10003;" : "&#10007;"}</span>
    </div>
    <h1 style="color: #111827; font-size: 24px; margin: 0 0 12px 0;">${escapeHtml(title)}</h1>
    <p style="color: #6b7280; font-size: 16px; line-height: 1.5; margin: 0;">${escapeHtml(message)}</p>
    ${tenantInfo}
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}
