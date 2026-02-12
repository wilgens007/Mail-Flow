import { 
  users, tenants, contacts, campaigns, campaignSends, subscriptions, suppressions, eventLogs,
  type User, type InsertUser, type Tenant, type InsertTenant, 
  type Contact, type InsertContact, type Campaign, type InsertCampaign,
  type CampaignSend, type InsertCampaignSend, type Subscription, type InsertSubscription,
  type Suppression, type InsertSuppression, type EventLog, type InsertEventLog
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, inArray, gte, lte, count } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;

  // Tenants
  getTenant(id: string): Promise<Tenant | undefined>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined>;
  getAllTenants(): Promise<Tenant[]>;
  incrementEmailCount(tenantId: string, amount: number): Promise<void>;

  // Contacts
  getContacts(tenantId: string): Promise<Contact[]>;
  getContact(id: string): Promise<Contact | undefined>;
  getContactForTenant(id: string, tenantId: string): Promise<Contact | undefined>;
  getContactByEmail(tenantId: string, email: string): Promise<Contact | undefined>;
  createContact(contact: InsertContact): Promise<Contact>;
  createContacts(contacts: InsertContact[]): Promise<number>;
  updateContact(id: string, data: Partial<InsertContact>): Promise<Contact | undefined>;
  deleteContacts(ids: string[]): Promise<number>;
  getActiveContacts(tenantId: string): Promise<Contact[]>;
  getContactsByTags(tenantId: string, tags: string[]): Promise<Contact[]>;

  // Campaigns
  getCampaigns(tenantId: string): Promise<Campaign[]>;
  getCampaign(id: string): Promise<Campaign | undefined>;
  getCampaignForTenant(id: string, tenantId: string): Promise<Campaign | undefined>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, data: Partial<InsertCampaign> & Record<string, any>): Promise<Campaign | undefined>;
  deleteCampaign(id: string): Promise<boolean>;

  // Campaign Sends
  createCampaignSends(sends: InsertCampaignSend[]): Promise<number>;
  getQueuedSends(limit: number): Promise<CampaignSend[]>;
  updateCampaignSend(id: string, data: Partial<InsertCampaignSend>): Promise<void>;
  getCampaignSendStats(campaignId: string): Promise<{ delivered: number; bounced: number; complained: number }>;

  // Subscriptions
  getSubscription(tenantId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, data: Partial<InsertSubscription>): Promise<Subscription | undefined>;
  getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined>;

  // Suppressions
  getSuppression(tenantId: string, email: string): Promise<Suppression | undefined>;
  createSuppression(suppression: InsertSuppression): Promise<Suppression>;
  getSuppressions(tenantId: string): Promise<Suppression[]>;

  // Event Logs
  createEventLog(log: InsertEventLog): Promise<EventLog>;
  getRecentEvents(limit: number): Promise<EventLog[]>;

  // Analytics
  getTenantStats(tenantId: string): Promise<{
    totalContacts: number;
    activeContacts: number;
    totalCampaigns: number;
  }>;
  getEmailStats(tenantId: string, days: number): Promise<{
    sent: number;
    delivered: number;
    bounced: number;
    complained: number;
    dailyStats: { date: string; sent: number; delivered: number; bounced: number }[];
  }>;
  getSystemStats(): Promise<{
    totalEmailsSent: number;
    totalDelivered: number;
    totalBounced: number;
    totalComplaints: number;
    suppressedEmails: number;
    queuedEmails: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  // Tenants
  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [newTenant] = await db.insert(tenants).values(tenant).returning();
    return newTenant;
  }

  async updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [updated] = await db.update(tenants).set(data).where(eq(tenants.id, id)).returning();
    return updated;
  }

  async getAllTenants(): Promise<Tenant[]> {
    return db.select().from(tenants).orderBy(desc(tenants.createdAt));
  }

  async incrementEmailCount(tenantId: string, amount: number): Promise<void> {
    await db.update(tenants)
      .set({ emailsSentThisMonth: sql`${tenants.emailsSentThisMonth} + ${amount}` })
      .where(eq(tenants.id, tenantId));
  }

  // Contacts
  async getContacts(tenantId: string): Promise<Contact[]> {
    return db.select().from(contacts).where(eq(contacts.tenantId, tenantId)).orderBy(desc(contacts.createdAt));
  }

  async getContact(id: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
    return contact;
  }

  async getContactForTenant(id: string, tenantId: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts)
      .where(and(eq(contacts.id, id), eq(contacts.tenantId, tenantId)));
    return contact;
  }

  async getContactByEmail(tenantId: string, email: string): Promise<Contact | undefined> {
    const [contact] = await db.select().from(contacts)
      .where(and(eq(contacts.tenantId, tenantId), eq(contacts.email, email)));
    return contact;
  }

  async createContact(contact: InsertContact): Promise<Contact> {
    const [newContact] = await db.insert(contacts).values(contact).returning();
    return newContact;
  }

  async createContacts(contactsData: InsertContact[]): Promise<number> {
    if (contactsData.length === 0) return 0;
    const result = await db.insert(contacts).values(contactsData).returning();
    return result.length;
  }

  async updateContact(id: string, data: Partial<InsertContact>): Promise<Contact | undefined> {
    const [updated] = await db.update(contacts).set(data).where(eq(contacts.id, id)).returning();
    return updated;
  }

  async deleteContacts(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    const result = await db.delete(contacts).where(inArray(contacts.id, ids)).returning();
    return result.length;
  }

  async getActiveContacts(tenantId: string): Promise<Contact[]> {
    return db.select().from(contacts)
      .where(and(eq(contacts.tenantId, tenantId), eq(contacts.unsubscribed, false)));
  }

  async getContactsByTags(tenantId: string, tags: string[]): Promise<Contact[]> {
    const allContacts = await this.getActiveContacts(tenantId);
    return allContacts.filter(c => c.tags?.some(t => tags.includes(t)));
  }

  // Campaigns
  async getCampaigns(tenantId: string): Promise<Campaign[]> {
    return db.select().from(campaigns).where(eq(campaigns.tenantId, tenantId)).orderBy(desc(campaigns.createdAt));
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }

  async getCampaignForTenant(id: string, tenantId: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns)
      .where(and(eq(campaigns.id, id), eq(campaigns.tenantId, tenantId)));
    return campaign;
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [newCampaign] = await db.insert(campaigns).values(campaign).returning();
    return newCampaign;
  }

  async updateCampaign(id: string, data: Partial<InsertCampaign> & Record<string, any>): Promise<Campaign | undefined> {
    const [updated] = await db.update(campaigns).set(data).where(eq(campaigns.id, id)).returning();
    return updated;
  }

  async deleteCampaign(id: string): Promise<boolean> {
    const result = await db.delete(campaigns).where(eq(campaigns.id, id)).returning();
    return result.length > 0;
  }

  // Campaign Sends
  async createCampaignSends(sends: InsertCampaignSend[]): Promise<number> {
    if (sends.length === 0) return 0;
    const result = await db.insert(campaignSends).values(sends).returning();
    return result.length;
  }

  async getQueuedSends(limit: number): Promise<CampaignSend[]> {
    return db.select().from(campaignSends)
      .where(eq(campaignSends.status, "queued"))
      .limit(limit)
      .orderBy(campaignSends.createdAt);
  }

  async updateCampaignSend(id: string, data: Partial<InsertCampaignSend>): Promise<void> {
    await db.update(campaignSends).set(data).where(eq(campaignSends.id, id));
  }

  async getCampaignSendStats(campaignId: string): Promise<{ delivered: number; bounced: number; complained: number }> {
    const sends = await db.select().from(campaignSends).where(eq(campaignSends.campaignId, campaignId));
    return {
      delivered: sends.filter(s => s.status === "delivered" || s.status === "sent").length,
      bounced: sends.filter(s => s.status === "bounced").length,
      complained: sends.filter(s => s.status === "complained").length,
    };
  }

  // Subscriptions
  async getSubscription(tenantId: string): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId));
    return subscription;
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [newSubscription] = await db.insert(subscriptions).values(subscription).returning();
    return newSubscription;
  }

  async updateSubscription(id: string, data: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const [updated] = await db.update(subscriptions).set(data).where(eq(subscriptions.id, id)).returning();
    return updated;
  }

  async getSubscriptionByStripeId(stripeSubscriptionId: string): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions)
      .where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
    return subscription;
  }

  // Suppressions
  async getSuppression(tenantId: string, email: string): Promise<Suppression | undefined> {
    const [suppression] = await db.select().from(suppressions)
      .where(and(eq(suppressions.tenantId, tenantId), eq(suppressions.email, email)));
    return suppression;
  }

  async createSuppression(suppression: InsertSuppression): Promise<Suppression> {
    const [newSuppression] = await db.insert(suppressions).values(suppression).returning();
    return newSuppression;
  }

  async getSuppressions(tenantId: string): Promise<Suppression[]> {
    return db.select().from(suppressions).where(eq(suppressions.tenantId, tenantId));
  }

  // Event Logs
  async createEventLog(log: InsertEventLog): Promise<EventLog> {
    const [newLog] = await db.insert(eventLogs).values(log).returning();
    return newLog;
  }

  async getRecentEvents(limit: number): Promise<EventLog[]> {
    return db.select().from(eventLogs).orderBy(desc(eventLogs.createdAt)).limit(limit);
  }

  // Analytics
  async getTenantStats(tenantId: string): Promise<{ totalContacts: number; activeContacts: number; totalCampaigns: number }> {
    const allContacts = await db.select().from(contacts).where(eq(contacts.tenantId, tenantId));
    const campaignList = await db.select().from(campaigns).where(eq(campaigns.tenantId, tenantId));
    
    return {
      totalContacts: allContacts.length,
      activeContacts: allContacts.filter(c => !c.unsubscribed).length,
      totalCampaigns: campaignList.length,
    };
  }

  async getEmailStats(tenantId: string, days: number): Promise<{
    sent: number;
    delivered: number;
    bounced: number;
    complained: number;
    dailyStats: { date: string; sent: number; delivered: number; bounced: number }[];
  }> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const tenantCampaigns = await db.select().from(campaigns).where(eq(campaigns.tenantId, tenantId));
    const campaignIds = tenantCampaigns.map(c => c.id);

    if (campaignIds.length === 0) {
      return { sent: 0, delivered: 0, bounced: 0, complained: 0, dailyStats: [] };
    }

    const sends = await db.select().from(campaignSends)
      .where(and(
        inArray(campaignSends.campaignId, campaignIds),
        gte(campaignSends.createdAt, startDate)
      ));

    const dailyStatsMap = new Map<string, { sent: number; delivered: number; bounced: number }>();
    
    for (let i = 0; i < days; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];
      dailyStatsMap.set(dateStr, { sent: 0, delivered: 0, bounced: 0 });
    }

    sends.forEach(send => {
      const dateStr = new Date(send.createdAt).toISOString().split("T")[0];
      const stats = dailyStatsMap.get(dateStr);
      if (stats) {
        stats.sent++;
        if (send.status === "delivered" || send.status === "sent") stats.delivered++;
        if (send.status === "bounced") stats.bounced++;
      }
    });

    return {
      sent: sends.length,
      delivered: sends.filter(s => s.status === "delivered" || s.status === "sent").length,
      bounced: sends.filter(s => s.status === "bounced").length,
      complained: sends.filter(s => s.status === "complained").length,
      dailyStats: Array.from(dailyStatsMap.entries())
        .map(([date, stats]) => ({ date, ...stats }))
        .reverse(),
    };
  }

  async getSystemStats(): Promise<{
    totalEmailsSent: number;
    totalDelivered: number;
    totalBounced: number;
    totalComplaints: number;
    suppressedEmails: number;
    queuedEmails: number;
  }> {
    const allSends = await db.select().from(campaignSends);
    const allSuppressions = await db.select().from(suppressions);
    const queuedSends = await db.select().from(campaignSends).where(eq(campaignSends.status, "queued"));

    return {
      totalEmailsSent: allSends.filter(s => s.status !== "queued").length,
      totalDelivered: allSends.filter(s => s.status === "delivered" || s.status === "sent").length,
      totalBounced: allSends.filter(s => s.status === "bounced").length,
      totalComplaints: allSends.filter(s => s.status === "complained").length,
      suppressedEmails: allSuppressions.length,
      queuedEmails: queuedSends.length,
    };
  }
}

export const storage = new DatabaseStorage();
