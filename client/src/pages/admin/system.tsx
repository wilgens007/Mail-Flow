import { useQuery } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Mail,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Shield,
  Server,
  Activity,
  Clock,
} from "lucide-react";

interface SystemStats {
  totalEmailsSent: number;
  totalDelivered: number;
  totalBounced: number;
  totalComplaints: number;
  deliveryRate: number;
  bounceRate: number;
  complaintRate: number;
  recentEvents: {
    id: string;
    type: string;
    tenantId: string | null;
    createdAt: string;
  }[];
  suppressedEmails: number;
  queuedEmails: number;
}

export default function AdminSystemPage() {
  const { data: stats, isLoading } = useQuery<SystemStats>({
    queryKey: ["/api/admin/system/stats"],
    queryFn: async () => {
      const res = await fetch("/api/admin/system/stats", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch system stats");
      return res.json();
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Sent",
      value: stats?.totalEmailsSent ?? 0,
      icon: Mail,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
    {
      title: "Delivered",
      value: stats?.totalDelivered ?? 0,
      icon: CheckCircle,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
    {
      title: "Bounced",
      value: stats?.totalBounced ?? 0,
      icon: XCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Complaints",
      value: stats?.totalComplaints ?? 0,
      icon: AlertTriangle,
      color: "text-chart-4",
      bgColor: "bg-chart-4/10",
    },
  ];

  const getEventIcon = (type: string) => {
    switch (type) {
      case "bounce":
        return <XCircle className="w-4 h-4 text-destructive" />;
      case "complaint":
        return <AlertTriangle className="w-4 h-4 text-chart-4" />;
      case "send":
        return <Mail className="w-4 h-4 text-chart-1" />;
      case "delivery":
        return <CheckCircle className="w-4 h-4 text-chart-3" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">System Overview</h1>
        <p className="text-muted-foreground">Platform-wide statistics and monitoring</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Card key={index}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">{stat.title}</span>
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
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Health Metrics
            </CardTitle>
            <CardDescription>System performance indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Delivery Rate</span>
                <span className="font-medium text-chart-3">{stats?.deliveryRate ?? 0}%</span>
              </div>
              <Progress value={stats?.deliveryRate ?? 0} className="h-2" />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Bounce Rate</span>
                <span className={`font-medium ${(stats?.bounceRate ?? 0) > 5 ? "text-destructive" : ""}`}>
                  {stats?.bounceRate ?? 0}%
                </span>
              </div>
              <Progress 
                value={stats?.bounceRate ?? 0} 
                className="h-2"
              />
              {(stats?.bounceRate ?? 0) > 5 && (
                <p className="text-xs text-destructive mt-1">High bounce rate may affect deliverability</p>
              )}
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span>Complaint Rate</span>
                <span className={`font-medium ${(stats?.complaintRate ?? 0) > 0.1 ? "text-chart-4" : ""}`}>
                  {stats?.complaintRate ?? 0}%
                </span>
              </div>
              <Progress 
                value={(stats?.complaintRate ?? 0) * 10} 
                className="h-2"
              />
              {(stats?.complaintRate ?? 0) > 0.1 && (
                <p className="text-xs text-chart-4 mt-1">Elevated complaint rate detected</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Suppressed Emails</div>
                <div className="text-xl font-bold">{stats?.suppressedEmails?.toLocaleString() ?? 0}</div>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Queued</div>
                <div className="text-xl font-bold">{stats?.queuedEmails?.toLocaleString() ?? 0}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Recent Events
            </CardTitle>
            <CardDescription>Latest system events and notifications</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentEvents && stats.recentEvents.length > 0 ? (
              <div className="space-y-3">
                {stats.recentEvents.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getEventIcon(event.type)}
                      <div>
                        <div className="font-medium text-sm capitalize">{event.type}</div>
                        <div className="text-xs text-muted-foreground">
                          {event.tenantId ? `Tenant: ${event.tenantId.slice(0, 8)}...` : "System"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {new Date(event.createdAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No recent events</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Server className="w-5 h-5" />
            System Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-chart-3/10 rounded-lg">
              <CheckCircle className="w-6 h-6 text-chart-3" />
              <div>
                <div className="font-medium">Email Service</div>
                <div className="text-sm text-muted-foreground">Operational</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-chart-3/10 rounded-lg">
              <CheckCircle className="w-6 h-6 text-chart-3" />
              <div>
                <div className="font-medium">Database</div>
                <div className="text-sm text-muted-foreground">Connected</div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-4 bg-chart-3/10 rounded-lg">
              <CheckCircle className="w-6 h-6 text-chart-3" />
              <div>
                <div className="font-medium">Queue Worker</div>
                <div className="text-sm text-muted-foreground">Running</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
