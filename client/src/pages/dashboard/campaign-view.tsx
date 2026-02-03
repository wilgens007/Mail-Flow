import { useQuery } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/auth";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Edit,
  Send,
  Mail,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Users,
  TrendingUp,
} from "lucide-react";
import type { Campaign } from "@shared/schema";

interface CampaignViewProps {
  campaignId: string;
}

export default function CampaignViewPage({ campaignId }: CampaignViewProps) {
  const { data: campaign, isLoading } = useQuery<Campaign>({
    queryKey: ["/api/campaigns", campaignId],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${campaignId}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch campaign");
      return res.json();
    },
  });

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
        <Skeleton className="h-10 w-64" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px] lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="text-center py-12">
        <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Campaign not found</h2>
        <Link href="/dashboard/campaigns">
          <Button>Back to Campaigns</Button>
        </Link>
      </div>
    );
  }

  const totalRecipients = campaign.totalRecipients || 0;
  const delivered = campaign.delivered || 0;
  const bounced = campaign.bounced || 0;
  const complained = campaign.complained || 0;
  const pending = totalRecipients - delivered - bounced - complained;

  const deliveryRate = totalRecipients > 0 ? Math.round((delivered / totalRecipients) * 100) : 0;
  const bounceRate = totalRecipients > 0 ? Math.round((bounced / totalRecipients) * 100) : 0;

  const stats = [
    { 
      label: "Total Recipients", 
      value: totalRecipients, 
      icon: Users, 
      color: "text-chart-1",
      bgColor: "bg-chart-1/10"
    },
    { 
      label: "Delivered", 
      value: delivered, 
      icon: CheckCircle, 
      color: "text-chart-3",
      bgColor: "bg-chart-3/10"
    },
    { 
      label: "Bounced", 
      value: bounced, 
      icon: XCircle, 
      color: "text-destructive",
      bgColor: "bg-destructive/10"
    },
    { 
      label: "Complaints", 
      value: complained, 
      icon: AlertTriangle, 
      color: "text-chart-4",
      bgColor: "bg-chart-4/10"
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/campaigns">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{campaign.name}</h1>
              {getStatusBadge(campaign.status)}
            </div>
            <p className="text-muted-foreground">{campaign.subject || "No subject"}</p>
          </div>
        </div>
        {campaign.status === "draft" && (
          <div className="flex gap-2">
            <Link href={`/dashboard/campaigns/${campaignId}/edit`}>
              <Button variant="outline" className="gap-2" data-testid="button-edit">
                <Edit className="w-4 h-4" />
                Edit
              </Button>
            </Link>
            <Link href={`/dashboard/campaigns/${campaignId}/send`}>
              <Button className="gap-2" data-testid="button-send">
                <Send className="w-4 h-4" />
                Send
              </Button>
            </Link>
          </div>
        )}
      </div>

      {campaign.status !== "draft" && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.map((stat, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`w-4 h-4 ${stat.color}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Delivery Progress</CardTitle>
                <CardDescription>Real-time sending status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Overall Progress</span>
                    <span className="font-medium">{deliveryRate}%</span>
                  </div>
                  <Progress value={deliveryRate} className="h-3" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-chart-3" />
                      <span className="text-sm">Delivered</span>
                    </div>
                    <span className="font-medium">{delivered.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-chart-1" />
                      <span className="text-sm">Pending</span>
                    </div>
                    <span className="font-medium">{pending.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-destructive" />
                      <span className="text-sm">Bounced</span>
                    </div>
                    <span className="font-medium">{bounced.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-chart-4" />
                      <span className="text-sm">Complaints</span>
                    </div>
                    <span className="font-medium">{complained.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Performance Metrics</CardTitle>
                <CardDescription>Key campaign statistics</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Delivery Rate</span>
                    <TrendingUp className="w-4 h-4 text-chart-3" />
                  </div>
                  <div className="text-3xl font-bold text-chart-3">{deliveryRate}%</div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-muted-foreground">Bounce Rate</span>
                    {bounceRate > 5 && <AlertTriangle className="w-4 h-4 text-chart-4" />}
                  </div>
                  <div className={`text-3xl font-bold ${bounceRate > 5 ? "text-chart-4" : ""}`}>
                    {bounceRate}%
                  </div>
                  {bounceRate > 5 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      High bounce rate may affect deliverability
                    </p>
                  )}
                </div>

                {campaign.sentAt && (
                  <div className="text-sm text-muted-foreground">
                    Sent on {new Date(campaign.sentAt).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Email Preview</CardTitle>
          <CardDescription>How your email looks to recipients</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-hidden bg-white">
            <div className="p-4 bg-muted/50 border-b">
              <div className="text-sm text-muted-foreground">
                Subject: {campaign.subject || "No subject"}
              </div>
            </div>
            <div 
              className="p-6 min-h-[300px]"
              dangerouslySetInnerHTML={{ __html: campaign.htmlContent || "<p>No content</p>" }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
