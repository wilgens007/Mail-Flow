import type { Express } from "express";
import { createServer, type Server } from "http";
import express from "express";
import multer from "multer";
import Papa from "papaparse";
import { storage } from "./storage";
import { 
  hashPassword, verifyPassword, generateToken, 
  authMiddleware, adminMiddleware, tenantMiddleware,
  type AuthRequest 
} from "./auth";
import { loginSchema, signupSchema, PLAN_LIMITS } from "@shared/schema";
import { z } from "zod";

const upload = multer({ storage: multer.memoryStorage() });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  
  // Auth routes
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const data = signupSchema.parse(req.body);
      
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already registered" });
      }

      // Create tenant
      const tenant = await storage.createTenant({
        name: data.companyName,
        status: "active",
      });

      // Create subscription (free starter plan)
      await storage.createSubscription({
        tenantId: tenant.id,
        plan: "starter",
        status: "active",
      });

      // Create user
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
      const { name, sendingFromName, replyToEmail, companyAddress } = req.body;
      const updated = await storage.updateTenant(req.tenantId!, { 
        name, sendingFromName, replyToEmail, companyAddress 
      });
      res.json(updated);
    } catch (error) {
      console.error("Update tenant error:", error);
      res.status(500).json({ message: "Failed to update settings" });
    }
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
      const { name, subject, htmlContent, status, scheduledAt } = req.body;
      const campaign = await storage.createCampaign({
        tenantId: req.tenantId!,
        name,
        subject: subject || "",
        htmlContent: htmlContent || "",
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

      const { name, subject, htmlContent, status, scheduledAt } = req.body;
      const updated = await storage.updateCampaign(req.params.id, {
        name: name ?? campaign.name,
        subject: subject ?? campaign.subject,
        htmlContent: htmlContent ?? campaign.htmlContent,
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

      const { sendToAll, tags } = req.body;
      
      let contacts: Awaited<ReturnType<typeof storage.getActiveContacts>>;
      if (sendToAll) {
        contacts = await storage.getActiveContacts(req.tenantId!);
      } else {
        contacts = await storage.getContactsByTags(req.tenantId!, tags || []);
      }

      // Filter out suppressed contacts
      const suppressions = await storage.getSuppressions(req.tenantId!);
      const suppressedEmails = new Set(suppressions.map(s => s.email.toLowerCase()));
      contacts = contacts.filter(c => !suppressedEmails.has(c.email.toLowerCase()));

      if (contacts.length === 0) {
        return res.status(400).json({ message: "No eligible recipients" });
      }

      // Check email limit
      const tenant = await storage.getTenant(req.tenantId!);
      const subscription = await storage.getSubscription(req.tenantId!);
      const plan = subscription?.plan || "starter";
      const planInfo = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];
      const remaining = planInfo.emailsPerMonth - (tenant?.emailsSentThisMonth || 0);

      if (contacts.length > remaining) {
        return res.status(400).json({ message: `Exceeds email limit. ${remaining} emails remaining.` });
      }

      // Create campaign sends
      const sends = contacts.map(contact => ({
        campaignId: campaign.id,
        contactId: contact.id,
        status: "queued" as const,
      }));

      await storage.createCampaignSends(sends);

      // Update campaign status
      await storage.updateCampaign(campaign.id, {
        status: "sending",
        sentAt: new Date(),
        totalRecipients: contacts.length,
      });

      // Log event
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

      res.json({
        emailsSent: stats.sent,
        emailsDelivered: stats.delivered,
        emailsBounced: stats.bounced,
        emailsComplained: stats.complained,
        deliveryRate: stats.sent > 0 ? Math.round((stats.delivered / stats.sent) * 100) : 0,
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
      // For MVP, return a placeholder URL since Stripe isn't fully configured
      res.json({ 
        url: null,
        message: "Stripe integration requires configuration. Please set up Stripe keys."
      });
    } catch (error) {
      console.error("Create checkout error:", error);
      res.status(500).json({ message: "Failed to create checkout" });
    }
  });

  app.post("/api/billing/portal", authMiddleware, tenantMiddleware, async (req: AuthRequest, res) => {
    try {
      res.json({ 
        url: null,
        message: "Stripe integration requires configuration. Please set up Stripe keys."
      });
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
            userCount: 1, // Simplified for MVP
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

  // Unsubscribe endpoint (public)
  app.get("/api/unsubscribe", async (req, res) => {
    try {
      const { tenant, email, token } = req.query;
      
      if (!tenant || !email) {
        return res.status(400).send("Invalid unsubscribe link");
      }

      const contact = await storage.getContactByEmail(tenant as string, email as string);
      if (contact) {
        await storage.updateContact(contact.id, { unsubscribed: true });
        await storage.createSuppression({
          tenantId: tenant as string,
          email: email as string,
          reason: "unsubscribe",
        });
      }

      res.send(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Unsubscribed</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { font-family: system-ui, sans-serif; max-width: 400px; margin: 100px auto; text-align: center; padding: 20px; }
              h1 { color: #333; }
              p { color: #666; }
            </style>
          </head>
          <body>
            <h1>Unsubscribed</h1>
            <p>You have been successfully unsubscribed from this mailing list.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error("Unsubscribe error:", error);
      res.status(500).send("Failed to process unsubscribe request");
    }
  });

  return httpServer;
}
