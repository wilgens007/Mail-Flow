import { db } from "./db";
import { tenants, subscriptions, PLAN_LIMITS, type PlanKey, getTenantLimits, assertCanSend } from "@shared/schema";
import { eq } from "drizzle-orm";

export { getTenantLimits, assertCanSend };

export async function checkAndResetMonthlyUsage(tenantId: string): Promise<void> {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.id, tenantId));
  if (!tenant) return;
  
  const now = new Date();
  const resetDate = tenant.monthlyResetDate ? new Date(tenant.monthlyResetDate) : new Date(0);
  
  if (now.getMonth() !== resetDate.getMonth() || now.getFullYear() !== resetDate.getFullYear()) {
    await db.update(tenants).set({ 
      emailsSentThisMonth: 0, 
      monthlyResetDate: now 
    }).where(eq(tenants.id, tenantId));
  }
}

export async function getTenantPlan(tenantId: string): Promise<PlanKey> {
  const [sub] = await db.select().from(subscriptions).where(eq(subscriptions.tenantId, tenantId));
  return (sub?.plan as PlanKey) || "starter";
}
