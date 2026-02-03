import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { getAuthHeaders } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation, Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Save,
  Send,
  Eye,
  Loader2,
  Mail,
  Code,
  FileText,
} from "lucide-react";
import type { Campaign } from "@shared/schema";

const campaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  subject: z.string().min(1, "Subject line is required"),
  htmlContent: z.string().min(1, "Email content is required"),
});

type CampaignForm = z.infer<typeof campaignSchema>;

interface CampaignEditorProps {
  campaignId?: string;
}

export default function CampaignEditorPage({ campaignId }: CampaignEditorProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("edit");
  const isEditing = !!campaignId;

  const { data: campaign, isLoading: isLoadingCampaign } = useQuery<Campaign>({
    queryKey: ["/api/campaigns", campaignId],
    queryFn: async () => {
      const res = await fetch(`/api/campaigns/${campaignId}`, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch campaign");
      return res.json();
    },
    enabled: isEditing,
  });

  const form = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: "",
      subject: "",
      htmlContent: getDefaultTemplate(),
    },
  });

  useEffect(() => {
    if (campaign) {
      form.reset({
        name: campaign.name,
        subject: campaign.subject || "",
        htmlContent: campaign.htmlContent || getDefaultTemplate(),
      });
    }
  }, [campaign, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: CampaignForm) => {
      const url = isEditing ? `/api/campaigns/${campaignId}` : "/api/campaigns";
      const method = isEditing ? "PATCH" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to save campaign");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/campaigns"] });
      toast({ title: isEditing ? "Campaign updated" : "Campaign created" });
      if (!isEditing) {
        setLocation(`/dashboard/campaigns/${data.id}/edit`);
      }
    },
    onError: (error) => {
      toast({
        title: "Failed to save campaign",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CampaignForm) => {
    saveMutation.mutate(data);
  };

  const htmlContent = form.watch("htmlContent");

  if (isEditing && isLoadingCampaign) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

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
            <h1 className="text-2xl font-bold">
              {isEditing ? "Edit Campaign" : "Create Campaign"}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? "Update your email campaign" : "Design your email campaign"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={form.handleSubmit(onSubmit)}
            disabled={saveMutation.isPending}
            data-testid="button-save-draft"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Save Draft
          </Button>
          {isEditing && campaign?.status === "draft" && (
            <Link href={`/dashboard/campaigns/${campaignId}/send`}>
              <Button className="gap-2" data-testid="button-proceed-send">
                <Send className="w-4 h-4" />
                Send Campaign
              </Button>
            </Link>
          )}
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Campaign Details</CardTitle>
                  <CardDescription>Basic information about your campaign</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Campaign Name</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., June Newsletter" data-testid="input-campaign-name" {...field} />
                        </FormControl>
                        <FormDescription>Internal name for this campaign</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subject Line</FormLabel>
                        <FormControl>
                          <Input placeholder="e.g., Your monthly update is here!" data-testid="input-subject" {...field} />
                        </FormControl>
                        <FormDescription>What recipients will see in their inbox</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Tips</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <Mail className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Keep subject lines under 50 characters for best results</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Use personalization tags like {"{{firstName}}"} in your content</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Code className="w-4 h-4 mt-0.5 shrink-0" />
                    <span>Preview your email before sending to check formatting</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-2">
              <Card className="h-full">
                <CardHeader className="pb-2">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList>
                      <TabsTrigger value="edit" className="gap-2" data-testid="tab-edit">
                        <Code className="w-4 h-4" />
                        Edit
                      </TabsTrigger>
                      <TabsTrigger value="preview" className="gap-2" data-testid="tab-preview">
                        <Eye className="w-4 h-4" />
                        Preview
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </CardHeader>
                <CardContent>
                  <TabsContent value="edit" className="mt-0">
                    <FormField
                      control={form.control}
                      name="htmlContent"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Textarea
                              className="min-h-[500px] font-mono text-sm resize-none"
                              placeholder="Enter your email HTML content..."
                              data-testid="textarea-content"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  <TabsContent value="preview" className="mt-0">
                    <div className="border rounded-lg overflow-hidden bg-white">
                      <div className="p-4 bg-muted/50 border-b">
                        <div className="text-sm text-muted-foreground">Subject: {form.watch("subject") || "No subject"}</div>
                      </div>
                      <div 
                        className="p-6 min-h-[450px]"
                        dangerouslySetInnerHTML={{ __html: htmlContent || "<p>No content yet</p>" }}
                      />
                    </div>
                  </TabsContent>
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}

function getDefaultTemplate() {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Hello {{firstName}}!</h1>
  </div>
  
  <div style="background: #ffffff; padding: 40px 20px; border: 1px solid #e5e7eb; border-top: none;">
    <p style="margin-top: 0;">We're excited to share some updates with you.</p>
    
    <p>This is a sample email template. Replace this content with your actual message.</p>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="https://example.com" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">Learn More</a>
    </div>
    
    <p>Best regards,<br>The Team</p>
  </div>
  
  <div style="background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
    <p style="margin: 0 0 10px 0;">{{companyAddress}}</p>
    <p style="margin: 0;">
      <a href="{{unsubscribeUrl}}" style="color: #6b7280;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>`;
}
