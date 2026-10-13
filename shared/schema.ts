import { sql, relations } from "drizzle-orm";
import { pgTable, text, varchar, boolean, timestamp, integer, jsonb, pgEnum, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userRoleEnum = pgEnum("user_role", ["admin", "user"]);
export const tenantStatusEnum = pgEnum("tenant_status", ["active", "disabled"]);
export const campaignStatusEnum = pgEnum("campaign_status", ["draft", "scheduled", "sending", "sent"]);
export const sendStatusEnum = pgEnum("send_status", ["queued", "sending", "sent", "delivered", "bounced", "complained", "failed", "unsubscribed"]);
export const suppressionReasonEnum = pgEnum("suppression_reason", ["bounce", "complaint", "unsubscribe"]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", ["starter", "pro", "agency"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "past_due", "canceled", "trialing"]);

// Tenants table
export const tenants = pgTable("tenants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  sendingFromName: text("sending_from_name").default(""),
  defaultFromEmail: text("default_from_email").default(""),
  replyToEmail: text("reply_to_email").default(""),
  companyAddress: text("company_address").default(""),
  stripeCustomerId: text("stripe_customer_id"),
  status: tenantStatusEnum("status").default("active").notNull(),
  emailsSentThisMonth: integer("emails_sent_this_month").default(0).notNull(),
  monthlyResetDate: timestamp("monthly_reset_date").defaultNow(),
  billingCycleStart: timestamp("billing_cycle_start").defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  firstName: text("first_name").default(""),
  lastName: text("last_name").default(""),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  role: userRoleEnum("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Contacts table
export const contacts = pgTable("contacts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  email: text("email").notNull(),
  firstName: text("first_name").default(""),
  lastName: text("last_name").default(""),
  tags: text("tags").array().default(sql`'{}'::text[]`),
  unsubscribed: boolean("unsubscribed").default(false).notNull(),
  unsubscribedAt: timestamp("unsubscribed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Campaigns table
export const campaigns = pgTable("campaigns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  name: text("name").notNull(),
  subject: text("subject").default(""),
  htmlContent: text("html_content").default(""),
  contentJson: jsonb("content_json"),
  editorMode: text("editor_mode").default("html"),
  status: campaignStatusEnum("status").default("draft").notNull(),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  totalRecipients: integer("total_recipients").default(0),
  delivered: integer("delivered").default(0),
  bounced: integer("bounced").default(0),
  complained: integer("complained").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Campaign Sends table - with unique constraint for idempotency
export const campaignSends = pgTable("campaign_sends", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  campaignId: varchar("campaign_id").references(() => campaigns.id).notNull(),
  contactId: varchar("contact_id").references(() => contacts.id).notNull(),
  status: sendStatusEnum("status").default("queued").notNull(),
  messageId: text("message_id"),
  attempts: integer("attempts").default(0).notNull(),
  lastError: text("last_error"),
  sentAt: timestamp("sent_at"),
  openedAt: timestamp("opened_at"),
  openCount: integer("open_count").default(0).notNull(),
  clickedAt: timestamp("clicked_at"),
  clickCount: integer("click_count").default(0).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("campaign_sends_tenant_campaign_contact_idx").on(table.tenantId, table.campaignId, table.contactId),
]);

// Subscriptions table
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  plan: subscriptionPlanEnum("plan").default("starter").notNull(),
  status: subscriptionStatusEnum("status").default("active").notNull(),
  currentPeriodStart: timestamp("current_period_start"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Suppressions table
export const suppressions = pgTable("suppressions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  email: text("email").notNull(),
  reason: suppressionReasonEnum("reason").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Event Logs table
export const eventLogs = pgTable("event_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  type: text("type").notNull(),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Password Reset Tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id).notNull(),
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Subscription Events audit table
export const subscriptionEvents = pgTable("subscription_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id).notNull(),
  stripeEventId: text("stripe_event_id"),
  eventType: text("event_type").notNull(),
  plan: text("plan"),
  status: text("status"),
  payload: jsonb("payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  contacts: many(contacts),
  campaigns: many(campaigns),
  subscriptions: many(subscriptions),
  suppressions: many(suppressions),
  eventLogs: many(eventLogs),
  subscriptionEvents: many(subscriptionEvents),
}));

export const usersRelations = relations(users, ({ one }) => ({
  tenant: one(tenants, {
    fields: [users.tenantId],
    references: [tenants.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [contacts.tenantId],
    references: [tenants.id],
  }),
  campaignSends: many(campaignSends),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [campaigns.tenantId],
    references: [tenants.id],
  }),
  sends: many(campaignSends),
}));

export const campaignSendsRelations = relations(campaignSends, ({ one }) => ({
  campaign: one(campaigns, {
    fields: [campaignSends.campaignId],
    references: [campaigns.id],
  }),
  contact: one(contacts, {
    fields: [campaignSends.contactId],
    references: [contacts.id],
  }),
  tenant: one(tenants, {
    fields: [campaignSends.tenantId],
    references: [tenants.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [subscriptions.tenantId],
    references: [tenants.id],
  }),
}));

export const suppressionsRelations = relations(suppressions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [suppressions.tenantId],
    references: [tenants.id],
  }),
}));

export const eventLogsRelations = relations(eventLogs, ({ one }) => ({
  tenant: one(tenants, {
    fields: [eventLogs.tenantId],
    references: [tenants.id],
  }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, {
    fields: [passwordResetTokens.userId],
    references: [users.id],
  }),
}));

export const subscriptionEventsRelations = relations(subscriptionEvents, ({ one }) => ({
  tenant: one(tenants, {
    fields: [subscriptionEvents.tenantId],
    references: [tenants.id],
  }),
}));

// Insert schemas
export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
  emailsSentThisMonth: true,
  billingCycleStart: true,
  monthlyResetDate: true,
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertContactSchema = createInsertSchema(contacts).omit({
  id: true,
  createdAt: true,
});

export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  sentAt: true,
  totalRecipients: true,
  delivered: true,
  bounced: true,
  complained: true,
});

export const insertCampaignSendSchema = createInsertSchema(campaignSends).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
});

export const insertSuppressionSchema = createInsertSchema(suppressions).omit({
  id: true,
  createdAt: true,
});

export const insertEventLogSchema = createInsertSchema(eventLogs).omit({
  id: true,
  createdAt: true,
});

export const insertPasswordResetTokenSchema = createInsertSchema(passwordResetTokens).omit({
  id: true,
  createdAt: true,
});

export const insertSubscriptionEventSchema = createInsertSchema(subscriptionEvents).omit({
  id: true,
  createdAt: true,
});

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signupSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().min(1, "Company name is required"),
});

// Types
export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Contact = typeof contacts.$inferSelect;
export type InsertContact = z.infer<typeof insertContactSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type CampaignSend = typeof campaignSends.$inferSelect;
export type InsertCampaignSend = z.infer<typeof insertCampaignSendSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Suppression = typeof suppressions.$inferSelect;
export type InsertSuppression = z.infer<typeof insertSuppressionSchema>;
export type EventLog = typeof eventLogs.$inferSelect;
export type InsertEventLog = z.infer<typeof insertEventLogSchema>;
export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = z.infer<typeof insertPasswordResetTokenSchema>;
export type SubscriptionEvent = typeof subscriptionEvents.$inferSelect;
export type InsertSubscriptionEvent = z.infer<typeof insertSubscriptionEventSchema>;

// Plan limits - centralized
export const PLAN_LIMITS = {
  starter: { emailsPerMonth: 1000, name: "Starter", price: 19 },
  pro: { emailsPerMonth: 10000, name: "Pro", price: 49 },
  agency: { emailsPerMonth: 50000, name: "Agency", price: 149 },
} as const;

export type PlanKey = keyof typeof PLAN_LIMITS;

export function getTenantLimits(plan: PlanKey) {
  return PLAN_LIMITS[plan];
}

export function assertCanSend(emailsSentThisMonth: number, intendedRecipientCount: number, plan: PlanKey): { allowed: boolean; remaining: number; message?: string } {
  const limits = getTenantLimits(plan);
  const remaining = limits.emailsPerMonth - emailsSentThisMonth;
  if (intendedRecipientCount > remaining) {
    return {
      allowed: false,
      remaining,
      message: `Exceeds email limit. ${remaining} emails remaining on your ${limits.name} plan.`,
    };
  }
  return { allowed: true, remaining };
}
