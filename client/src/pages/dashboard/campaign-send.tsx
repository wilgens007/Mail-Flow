import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { getAuthHeaders, useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  Send,
  Users,
  Mail,
  AlertCircle,
  CheckCircle,
  Loader2,
  Calendar,
} from "lucide-react";
import type { Campaign, Contact } from "@shared/schema";
import { PLAN_LIMITS } from "@shared/schema";

interface CampaignSendProps {
  campaignId: string;
}

export default function CampaignSendPage({ campaignId }: CampaignSendProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [confirmSend, setConfirmSend] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sendToAll, setSendToAll] = useState(true);

  const { data: campaign, isLoading: isLoadingCampaign } = useQuery<Campaign>({
    queryKey: ["/api/campaigns", campaignId],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${campaignId}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch campaign");
      return res.json();
    },
  });

  const { data: contacts } = useQuery<Contact[]>({
    queryKey: ["/api/contacts"],
    queryFn: async () => {
      const res = await fetch("/api/contacts", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch contacts");
      return res.json();
    },
  });

  const { data: stats } = useQuery({
    queryKey: ["/api/dashboard/stats"],
    queryFn: async () => {
      const res = await fetch("/api/dashboard/stats", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/campaigns/${campaignId}/send`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({
          sendToAll,
          tags: sendToAll ? [] : selectedTags,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to send campaign");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Campaign sending started!",
        description: "Your emails are being sent. Check the campaign details for progress.",
      });
      setLocation(`/dashboard/campaigns/${campaignId}`);
    },
    onError: (error) => {
      toast({
        title: "Failed to send campaign",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const activeContacts = contacts?.filter(c => !c.unsubscribed) ?? [];
  const allTags = [...new Set(activeContacts.flatMap(c => c.tags || []))];
  
  const recipientCount = sendToAll 
    ? activeContacts.length 
    : activeContacts.filter(c => c.tags?.some(t => selectedTags.includes(t))).length;

  const plan = user?.subscription?.plan || "starter";
  const planInfo = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];
  const emailsRemaining = planInfo.emailsPerMonth - (stats?.emailsSentThisMonth || 0);
  const willExceedLimit = recipientCount > emailsRemaining;

  if (isLoadingCampaign) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid lg:grid-cols-3 gap-6">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px] lg:col-span-2" />
        </div>
      </div>
    );
  }

  if (!campaign || campaign.status !== "draft") {
    return (
      <div className="text-center py-12">
        <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">Campaign not available</h2>
        <p className="text-muted-foreground mb-4">
          This campaign cannot be sent or has already been sent.
        </p>
        <Link href="/dashboard/campaigns">
          <Button>Back to Campaigns</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/campaigns/${campaignId}/edit`}>
          <Button variant="ghost" size="icon" data-testid="button-back">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Send Campaign</h1>
          <p className="text-muted-foreground">Review and send "{campaign.name}"</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Campaign Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">Name</div>
                <div className="font-medium">{campaign.name}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Subject</div>
                <div className="font-medium">{campaign.subject || "No subject"}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Status</div>
                <Badge variant="outline">{campaign.status}</Badge>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Email Quota</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Used this month</span>
                <span className="font-medium">{stats?.emailsSentThisMonth?.toLocaleString() || 0}</span>
              </div>
              <Progress 
                value={((stats?.emailsSentThisMonth || 0) / planInfo.emailsPerMonth) * 100} 
                className="h-2"
              />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Remaining</span>
                <span className="font-medium">{emailsRemaining.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Plan limit</span>
                <span>{planInfo.emailsPerMonth.toLocaleString()} / month</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Select Recipients
              </CardTitle>
              <CardDescription>Choose who will receive this campaign</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="sendToAll" 
                  checked={sendToAll} 
                  onCheckedChange={(checked) => setSendToAll(!!checked)}
                  data-testid="checkbox-send-all"
                />
                <label htmlFor="sendToAll" className="text-sm font-medium cursor-pointer">
                  Send to all active contacts ({activeContacts.length})
                </label>
              </div>

              {!sendToAll && (
                <div className="space-y-3">
                  <label className="text-sm font-medium">Filter by tags</label>
                  <div className="flex flex-wrap gap-2">
                    {allTags.length > 0 ? (
                      allTags.map((tag) => (
                        <Badge
                          key={tag}
                          variant={selectedTags.includes(tag) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => {
                            if (selectedTags.includes(tag)) {
                              setSelectedTags(selectedTags.filter(t => t !== tag));
                            } else {
                              setSelectedTags([...selectedTags, tag]);
                            }
                          }}
                        >
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No tags available</p>
                    )}
                  </div>
                </div>
              )}

              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="w-5 h-5 text-primary" />
                    <span className="font-medium">Recipients</span>
                  </div>
                  <span className="text-2xl font-bold">{recipientCount.toLocaleString()}</span>
                </div>
              </div>

              {willExceedLimit && (
                <div className="flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium text-destructive">Exceeds email quota</div>
                    <p className="text-sm text-muted-foreground">
                      You're trying to send {recipientCount.toLocaleString()} emails but only have {emailsRemaining.toLocaleString()} remaining this month.
                    </p>
                    <Link href="/dashboard/billing">
                      <Button variant="outline" size="sm" className="mt-2">Upgrade Plan</Button>
                    </Link>
                  </div>
                </div>
              )}

              {recipientCount === 0 && (
                <div className="flex items-start gap-3 p-4 bg-chart-4/10 border border-chart-4/20 rounded-lg">
                  <AlertCircle className="w-5 h-5 text-chart-4 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-medium">No recipients selected</div>
                    <p className="text-sm text-muted-foreground">
                      {sendToAll 
                        ? "You don't have any active contacts. Add contacts first."
                        : "Select at least one tag or enable 'Send to all'."}
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle className="w-5 h-5 text-chart-3" />
                  <span>Ready to send to {recipientCount.toLocaleString()} recipients</span>
                </div>
                <div className="flex gap-2">
                  <Link href={`/dashboard/campaigns/${campaignId}/edit`}>
                    <Button variant="outline" data-testid="button-back-edit">Back to Edit</Button>
                  </Link>
                  <Button 
                    onClick={() => setConfirmSend(true)}
                    disabled={recipientCount === 0 || willExceedLimit}
                    className="gap-2"
                    data-testid="button-send-now"
                  >
                    <Send className="w-4 h-4" />
                    Send Now
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={confirmSend} onOpenChange={setConfirmSend}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Send campaign?</AlertDialogTitle>
            <AlertDialogDescription>
              You're about to send "{campaign.name}" to {recipientCount.toLocaleString()} recipients. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
            >
              {sendMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Campaign
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
