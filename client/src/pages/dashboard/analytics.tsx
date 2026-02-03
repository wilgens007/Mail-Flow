import { useQuery } from "@tanstack/react-query";
import { getAuthHeaders } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  Mail,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  Users,
  Send,
} from "lucide-react";

interface AnalyticsData {
  emailsSent: number;
  emailsDelivered: number;
  emailsBounced: number;
  emailsComplained: number;
  deliveryRate: number;
  dailyStats: { date: string; sent: number; delivered: number; bounced: number }[];
  topCampaigns: { name: string; delivered: number; bounced: number }[];
}

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState("30");

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/analytics", timeRange],
    queryFn: async () => {
      const res = await fetch(`/api/analytics?days=${timeRange}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch analytics");
      return res.json();
    },
  });

  const statCards = [
    {
      title: "Emails Sent",
      value: analytics?.emailsSent ?? 0,
      icon: Send,
      color: "text-chart-1",
      bgColor: "bg-chart-1/10",
    },
    {
      title: "Delivered",
      value: analytics?.emailsDelivered ?? 0,
      icon: CheckCircle,
      color: "text-chart-3",
      bgColor: "bg-chart-3/10",
    },
    {
      title: "Bounced",
      value: analytics?.emailsBounced ?? 0,
      icon: XCircle,
      color: "text-destructive",
      bgColor: "bg-destructive/10",
    },
    {
      title: "Delivery Rate",
      value: `${analytics?.deliveryRate ?? 0}%`,
      icon: TrendingUp,
      color: "text-chart-2",
      bgColor: "bg-chart-2/10",
    },
  ];

  const COLORS = ["hsl(var(--chart-3))", "hsl(var(--destructive))", "hsl(var(--chart-4))"];

  const pieData = analytics ? [
    { name: "Delivered", value: analytics.emailsDelivered },
    { name: "Bounced", value: analytics.emailsBounced },
    { name: "Complaints", value: analytics.emailsComplained },
  ].filter(d => d.value > 0) : [];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">Track your email performance</p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40" data-testid="select-time-range">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
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
              <div className="text-2xl font-bold">
                {typeof stat.value === "number" ? stat.value.toLocaleString() : stat.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sending Trend</CardTitle>
            <CardDescription>Daily email activity over time</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics?.dailyStats && analytics.dailyStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={analytics.dailyStats}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    className="text-muted-foreground"
                  />
                  <YAxis tick={{ fontSize: 12 }} className="text-muted-foreground" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <Area
                    type="monotone"
                    dataKey="delivered"
                    stackId="1"
                    stroke="hsl(var(--chart-3))"
                    fill="hsl(var(--chart-3) / 0.2)"
                    name="Delivered"
                  />
                  <Area
                    type="monotone"
                    dataKey="bounced"
                    stackId="1"
                    stroke="hsl(var(--destructive))"
                    fill="hsl(var(--destructive) / 0.2)"
                    name="Bounced"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No email data available for this period</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Delivery Breakdown</CardTitle>
            <CardDescription>Distribution of email outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "0.5rem",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
            <div className="space-y-2 mt-4">
              {pieData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: COLORS[index] }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top Campaigns</CardTitle>
          <CardDescription>Best performing campaigns by delivery</CardDescription>
        </CardHeader>
        <CardContent>
          {analytics?.topCampaigns && analytics.topCampaigns.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analytics.topCampaigns} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" tick={{ fontSize: 12 }} className="text-muted-foreground" />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  tick={{ fontSize: 12 }} 
                  width={150}
                  className="text-muted-foreground"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "0.5rem",
                  }}
                />
                <Bar dataKey="delivered" fill="hsl(var(--chart-3))" name="Delivered" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <Send className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No campaign data available</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
