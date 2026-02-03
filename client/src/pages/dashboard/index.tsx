import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import { useAuth, getAuthHeaders } from "@/lib/auth";
import { 
  Users, 
  Send, 
  TrendingUp, 
  AlertCircle,
  ArrowRight,
  Mail,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { PLAN_LIMITS } from "@shared/schema";
import type { Campaign, Contact } from "@shared/schema";

interface DashboardStats {
  totalContacts: number;
  activeContacts: number;
  totalCampaigns: number;
  emailsSentThisMonth: number;
  emailLimit: number;
  recentCampaigns: Campaign[];
  recentContacts: Contact[];
}

export default function DashboardPage() {
  const { user } = useAuth();
  
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats", {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const plan = user?.subscription?.plan || "starter";
  const planInfo = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];
  const emailUsagePercent = stats ? Math.round((stats.emailsSentThisMonth / stats.emailLimit) * 100) : 0;

  const statCards = [
    {
      title: "Total Contacts",
      value: stats?.totalContacts ?? 0,
      description: `${stats?.activeContacts ?? 0} active`,
      icon: Users,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
    {
      title: "Campaigns",
      value: stats?.totalCampaigns ?? 0,
      description: "Total created",
      icon: Send,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
    {
      title: "Emails Sent",
      value: stats?.emailsSentThisMonth ?? 0,
      description: `${planInfo.emailsPerMonth.toLocaleString()} limit`,
      icon: Mail,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
    {
      title: "Usage",
      value: `${emailUsagePercent}%`,
      description: "of monthly limit",
      icon: TrendingUp,
      color: emailUsagePercent > 80 ? "text-destructive" : "text-chart-4",
      bgColor: emailUsagePercent > 80 ? "bg-destructive/10" : "bg-chart-4/10",
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge variant="secondary" className="gap-1"><CheckCircle className="w-3 h-3" />Sent</Badge>;
      case "draft":
        return <Badge variant="outline" className="gap-1"><Clock className="w-3 h-3" />Draft</Badge>;
      case "scheduled":
        return <Badge className="gap-1 bg-chart-4/10 text-chart-4 border-chart-4/20"><Clock className="w-3 h-3" />Scheduled</Badge>;
      case "sending":
        return <Badge className="gap-1 bg-chart-1/10 text-chart-1 border-chart-1/20"><Send className="w-3 h-3" />Sending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-lg" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back, {user?.firstName || "there"}!</p>
        </div>
        <div className="flex gap-2">
          <Link href="/dashboard/contacts">
            <Button variant="outline" className="gap-2" data-testid="button-add-contacts">
              <Users className="w-4 h-4" />
              Add Contacts
            </Button>
          </Link>
          <Link href="/dashboard/campaigns/new">
            <Button className="gap-2" data-testid="button-new-campaign">
              <Send className="w-4 h-4" />
              New Campaign
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between gap-4 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-4 h-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {emailUsagePercent > 80 && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertCircle className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium">Approaching email limit</h3>
              <p className="text-sm text-muted-foreground">
                You've used {emailUsagePercent}% of your monthly email quota. Upgrade to send more emails.
              </p>
            </div>
            <Link href="/dashboard/billing">
              <Button variant="outline" data-testid="button-upgrade-alert">Upgrade Plan</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Recent Campaigns</CardTitle>
              <CardDescription>Your latest email campaigns</CardDescription>
            </div>
            <Link href="/dashboard/campaigns">
              <Button variant="ghost" size="sm" className="gap-1" data-testid="link-view-campaigns">
                View all <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.recentCampaigns && stats.recentCampaigns.length > 0 ? (
              <div className="space-y-4">
                {stats.recentCampaigns.slice(0, 5).map((campaign) => (
                  <div key={campaign.id} className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{campaign.name}</div>
                      <div className="text-sm text-muted-foreground truncate">{campaign.subject || "No subject"}</div>
                    </div>
                    {getStatusBadge(campaign.status)}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Send className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No campaigns yet</p>
                <Link href="/dashboard/campaigns/new">
                  <Button variant="link" className="mt-2" data-testid="link-create-first-campaign">
                    Create your first campaign
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-4">
            <div>
              <CardTitle>Recent Contacts</CardTitle>
              <CardDescription>Newly added contacts</CardDescription>
            </div>
            <Link href="/dashboard/contacts">
              <Button variant="ghost" size="sm" className="gap-1" data-testid="link-view-contacts">
                View all <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats?.recentContacts && stats.recentContacts.length > 0 ? (
              <div className="space-y-4">
                {stats.recentContacts.slice(0, 5).map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-xs font-medium text-primary">
                          {(contact.firstName?.[0] || contact.email[0]).toUpperCase()}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate">
                          {contact.firstName && contact.lastName 
                            ? `${contact.firstName} ${contact.lastName}`
                            : contact.email}
                        </div>
                        {contact.firstName && <div className="text-sm text-muted-foreground truncate">{contact.email}</div>}
                      </div>
                    </div>
                    {contact.unsubscribed && (
                      <Badge variant="outline" className="text-muted-foreground gap-1">
                        <XCircle className="w-3 h-3" />
                        Unsubscribed
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No contacts yet</p>
                <Link href="/dashboard/contacts">
                  <Button variant="link" className="mt-2" data-testid="link-add-first-contact">
                    Add your first contact
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Start Guide</CardTitle>
          <CardDescription>Complete these steps to get the most out of MailFlow</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              {
                step: 1,
                title: "Import Contacts",
                description: "Upload a CSV file with your email list",
                link: "/dashboard/contacts",
                complete: (stats?.totalContacts ?? 0) > 0,
              },
              {
                step: 2,
                title: "Create Campaign",
                description: "Design your first email campaign",
                link: "/dashboard/campaigns/new",
                complete: (stats?.totalCampaigns ?? 0) > 0,
              },
              {
                step: 3,
                title: "Configure Settings",
                description: "Set up your sender details",
                link: "/dashboard/settings",
                complete: false,
              },
            ].map((item) => (
              <Link key={item.step} href={item.link}>
                <div className={`p-4 rounded-lg border hover-elevate cursor-pointer ${item.complete ? "bg-chart-3/5 border-chart-3/20" : ""}`}>
                  <div className="flex items-center gap-3 mb-2">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${item.complete ? "bg-chart-3 text-white" : "bg-muted text-muted-foreground"}`}>
                      {item.complete ? <CheckCircle className="w-4 h-4" /> : item.step}
                    </div>
                    <span className="font-medium">{item.title}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
