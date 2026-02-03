import { useQuery, useMutation } from "@tanstack/react-query";
import { getAuthHeaders, useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CreditCard,
  Check,
  Zap,
  AlertCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { PLAN_LIMITS } from "@shared/schema";

export default function BillingPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const upgradeMutation = useMutation({
    mutationFn: async (plan: string) => {
      const res = await fetch("/api/billing/create-checkout", {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create checkout");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to start upgrade",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const manageBillingMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to open billing portal");
      }
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to open billing portal",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const currentPlan = user?.subscription?.plan || "starter";
  const currentPlanInfo = PLAN_LIMITS[currentPlan as keyof typeof PLAN_LIMITS];
  const emailsUsed = stats?.emailsSentThisMonth || 0;
  const usagePercent = Math.round((emailsUsed / currentPlanInfo.emailsPerMonth) * 100);

  const plans = Object.entries(PLAN_LIMITS).map(([key, plan]) => ({
    id: key,
    ...plan,
    features: [
      `${plan.emailsPerMonth.toLocaleString()} emails/month`,
      "Unlimited contacts",
      "Email templates",
      "Analytics dashboard",
      key !== "starter" && "Priority support",
      key === "agency" && "Custom branding",
      key === "agency" && "API access",
    ].filter(Boolean) as string[],
    isCurrent: key === currentPlan,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and billing</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Your current subscription details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-lg">{currentPlanInfo.name}</div>
                  <div className="text-muted-foreground">
                    ${currentPlanInfo.price}/month
                  </div>
                </div>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Email usage this month</span>
                <span className="font-medium">
                  {emailsUsed.toLocaleString()} / {currentPlanInfo.emailsPerMonth.toLocaleString()}
                </span>
              </div>
              <Progress value={usagePercent} className="h-2" />
              <p className="text-xs text-muted-foreground mt-2">
                {(currentPlanInfo.emailsPerMonth - emailsUsed).toLocaleString()} emails remaining
              </p>
            </div>

            {usagePercent > 80 && (
              <div className="flex items-start gap-3 p-4 bg-chart-4/10 border border-chart-4/20 rounded-lg">
                <AlertCircle className="w-5 h-5 text-chart-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium">Running low on emails</div>
                  <p className="text-sm text-muted-foreground">
                    Consider upgrading your plan to avoid interruptions.
                  </p>
                </div>
              </div>
            )}

            {user?.subscription?.stripeSubscriptionId && (
              <Button
                variant="outline"
                onClick={() => manageBillingMutation.mutate()}
                disabled={manageBillingMutation.isPending}
                className="gap-2"
                data-testid="button-manage-billing"
              >
                {manageBillingMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CreditCard className="w-4 h-4" />
                )}
                Manage Billing
                <ExternalLink className="w-3 h-3" />
              </Button>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Billing Period</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Current period</div>
              <div className="font-medium">
                {user?.subscription?.currentPeriodStart 
                  ? new Date(user.subscription.currentPeriodStart).toLocaleDateString()
                  : "—"} 
                {" - "}
                {user?.subscription?.currentPeriodEnd 
                  ? new Date(user.subscription.currentPeriodEnd).toLocaleDateString()
                  : "—"}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Next billing date</div>
              <div className="font-medium">
                {user?.subscription?.currentPeriodEnd 
                  ? new Date(user.subscription.currentPeriodEnd).toLocaleDateString()
                  : "Free plan"}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, index) => (
            <Card 
              key={plan.id}
              className={`relative ${plan.isCurrent ? "border-primary ring-2 ring-primary" : ""}`}
            >
              {index === 1 && !plan.isCurrent && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              {plan.isCurrent && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant="secondary">
                  Current Plan
                </Badge>
              )}

              <CardHeader className="text-center">
                <CardTitle>{plan.name}</CardTitle>
                <div className="flex items-baseline justify-center gap-1">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-3">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-chart-3 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {plan.isCurrent ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    variant={index === 1 ? "default" : "outline"}
                    onClick={() => upgradeMutation.mutate(plan.id)}
                    disabled={upgradeMutation.isPending}
                    data-testid={`button-select-${plan.id}`}
                  >
                    {upgradeMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : plans.findIndex(p => p.isCurrent) > index ? (
                      "Downgrade"
                    ) : (
                      "Upgrade"
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
