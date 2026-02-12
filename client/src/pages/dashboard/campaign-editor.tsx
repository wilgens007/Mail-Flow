import { useState, useEffect, useMemo } from "react";
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
import { Label } from "@/components/ui/label";
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
  Image,
  MousePointerClick,
  Type,
} from "lucide-react";
import type { Campaign } from "@shared/schema";
import RichTextEditor from "@/components/rich-text-editor";

const htmlCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  subject: z.string().min(1, "Subject line is required"),
  htmlContent: z.string().min(1, "Email content is required"),
});

const simpleCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  subject: z.string().min(1, "Subject line is required"),
  title: z.string().min(1, "Email title is required"),
  body: z.string().min(1, "Email body is required"),
  buttonText: z.string().optional(),
  buttonUrl: z.string().optional(),
  imageUrl: z.string().optional(),
});

type HtmlCampaignForm = z.infer<typeof htmlCampaignSchema>;
type SimpleCampaignForm = z.infer<typeof simpleCampaignSchema>;

interface CampaignEditorProps {
  campaignId?: string;
}

function generatePreviewHtml(data: { title: string; body: string; buttonText?: string; buttonUrl?: string; imageUrl?: string; subject?: string }) {
  const { title, body, buttonText, buttonUrl, imageUrl } = data;

  const imageBlock = imageUrl ? `
    <div style="padding: 0 0 24px 0;">
      <img src="${imageUrl}" alt="" style="max-width: 100%; height: auto; display: block; border-radius: 8px;" />
    </div>` : "";

  const buttonBlock = (buttonText && buttonUrl) ? `
    <div style="padding: 24px 0; text-align: center;">
      <a href="${buttonUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; border-radius: 6px; background-color: #6366f1;">
        ${buttonText}
      </a>
    </div>` : "";

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 40px 40px 32px; border-radius: 12px 12px 0 0; text-align: center;">
        <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff; line-height: 1.3;">${title || "Your Email Title"}</h1>
      </div>
      <div style="background-color: #ffffff; padding: 40px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
        ${imageBlock}
        <div style="font-size: 16px; line-height: 1.6; color: #374151;">
          ${body || "<p>Start writing your email content...</p>"}
        </div>
        ${buttonBlock}
      </div>
      <div style="background-color: #f9fafb; padding: 24px 40px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin: 0;">
          <a href="#" style="color: #9ca3af; text-decoration: underline;">Unsubscribe</a>
        </p>
      </div>
    </div>`;
}

export default function CampaignEditorPage({ campaignId }: CampaignEditorProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("edit");
  const [editorMode, setEditorMode] = useState<"simple" | "html">("simple");
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

  const htmlForm = useForm<HtmlCampaignForm>({
    resolver: zodResolver(htmlCampaignSchema),
    defaultValues: {
      name: "",
      subject: "",
      htmlContent: getDefaultTemplate(),
    },
  });

  const simpleForm = useForm<SimpleCampaignForm>({
    resolver: zodResolver(simpleCampaignSchema),
    defaultValues: {
      name: "",
      subject: "",
      title: "",
      body: "",
      buttonText: "",
      buttonUrl: "",
      imageUrl: "",
    },
  });

  useEffect(() => {
    if (campaign) {
      const mode = (campaign as any).editorMode === "simple" ? "simple" : "html";
      setEditorMode(mode);

      if (mode === "simple" && (campaign as any).contentJson) {
        const json = (campaign as any).contentJson as any;
        simpleForm.reset({
          name: campaign.name,
          subject: campaign.subject || "",
          title: json.title || "",
          body: json.body || "",
          buttonText: json.buttonText || "",
          buttonUrl: json.buttonUrl || "",
          imageUrl: json.imageUrl || "",
        });
        htmlForm.reset({
          name: campaign.name,
          subject: campaign.subject || "",
          htmlContent: campaign.htmlContent || getDefaultTemplate(),
        });
      } else {
        htmlForm.reset({
          name: campaign.name,
          subject: campaign.subject || "",
          htmlContent: campaign.htmlContent || getDefaultTemplate(),
        });
        simpleForm.reset({
          name: campaign.name,
          subject: campaign.subject || "",
          title: "",
          body: "",
          buttonText: "",
          buttonUrl: "",
          imageUrl: "",
        });
      }
    }
  }, [campaign]);

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const url = isEditing ? `/api/campaigns/${campaignId}` : "/api/campaigns";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(payload),
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

  const handleSave = () => {
    if (editorMode === "html") {
      htmlForm.handleSubmit((data) => {
        saveMutation.mutate({
          ...data,
          editorMode: "html",
          contentJson: null,
        });
      })();
    } else {
      simpleForm.handleSubmit((data) => {
        saveMutation.mutate({
          name: data.name,
          subject: data.subject,
          editorMode: "simple",
          contentJson: {
            title: data.title,
            body: data.body,
            buttonText: data.buttonText || "",
            buttonUrl: data.buttonUrl || "",
            imageUrl: data.imageUrl || "",
          },
          htmlContent: "",
        });
      })();
    }
  };

  const simpleTitle = simpleForm.watch("title");
  const simpleBody = simpleForm.watch("body");
  const simpleButtonText = simpleForm.watch("buttonText");
  const simpleButtonUrl = simpleForm.watch("buttonUrl");
  const simpleImageUrl = simpleForm.watch("imageUrl");
  const simpleSubject = simpleForm.watch("subject");
  const htmlContent = htmlForm.watch("htmlContent");

  const previewHtml = useMemo(() => {
    if (editorMode === "simple") {
      return generatePreviewHtml({
        title: simpleTitle || "",
        body: simpleBody || "",
        buttonText: simpleButtonText,
        buttonUrl: simpleButtonUrl,
        imageUrl: simpleImageUrl,
        subject: simpleSubject,
      });
    }
    return htmlContent || "<p>No content yet</p>";
  }, [editorMode, simpleTitle, simpleBody, simpleButtonText, simpleButtonUrl, simpleImageUrl, simpleSubject, htmlContent]);

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
            <h1 className="text-2xl font-bold" data-testid="text-editor-title">
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
            onClick={handleSave}
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

      <div className="flex items-center gap-2 p-1 bg-muted rounded-lg w-fit">
        <Button
          variant={editorMode === "simple" ? "default" : "ghost"}
          size="sm"
          onClick={() => setEditorMode("simple")}
          className="gap-2"
          data-testid="button-mode-simple"
        >
          <Type className="w-4 h-4" />
          Simple
        </Button>
        <Button
          variant={editorMode === "html" ? "default" : "ghost"}
          size="sm"
          onClick={() => setEditorMode("html")}
          className="gap-2"
          data-testid="button-mode-html"
        >
          <Code className="w-4 h-4" />
          HTML
        </Button>
      </div>

      {editorMode === "simple" ? (
        <Form {...simpleForm}>
          <SimpleEditor
            form={simpleForm}
            previewHtml={previewHtml}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </Form>
      ) : (
        <Form {...htmlForm}>
          <HtmlEditor
            form={htmlForm}
            previewHtml={previewHtml}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
          />
        </Form>
      )}
    </div>
  );
}

function SimpleEditor({
  form,
  previewHtml,
  activeTab,
  setActiveTab,
}: {
  form: ReturnType<typeof useForm<SimpleCampaignForm>>;
  previewHtml: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div className="space-y-6">
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
            <CardTitle className="text-lg">Email Content</CardTitle>
            <CardDescription>Build your email visually</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Hello there!" data-testid="input-title" {...field} />
                  </FormControl>
                  <FormDescription>Headline at the top of the email</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label>Body</Label>
              <FormField
                control={form.control}
                name="body"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RichTextEditor
                        content={field.value}
                        onChange={field.onChange}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MousePointerClick className="w-4 h-4" />
              Button (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="buttonText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Button Text</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Learn More" data-testid="input-button-text" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="buttonUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Button URL</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., https://example.com" data-testid="input-button-url" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Image className="w-4 h-4" />
              Image (Optional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Image URL</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., https://example.com/image.jpg" data-testid="input-image-url" {...field} />
                  </FormControl>
                  <FormDescription>Direct link to an image file</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <Card className="h-full">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="w-4 h-4" />
              Live Preview
            </CardTitle>
            <CardDescription>This is how your email will look</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg overflow-hidden bg-muted/20">
              <div className="p-3 bg-muted/50 border-b">
                <div className="text-sm text-muted-foreground">
                  Subject: {form.watch("subject") || "No subject"}
                </div>
              </div>
              <div
                className="p-4 min-h-[500px] bg-white dark:bg-gray-100"
                data-testid="preview-panel"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function HtmlEditor({
  form,
  previewHtml,
  activeTab,
  setActiveTab,
}: {
  form: ReturnType<typeof useForm<HtmlCampaignForm>>;
  previewHtml: string;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}) {
  return (
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
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="pb-2">
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
                <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-100">
                  <div className="p-4 bg-muted/50 border-b">
                    <div className="text-sm text-muted-foreground">Subject: {form.watch("subject") || "No subject"}</div>
                  </div>
                  <div
                    className="p-6 min-h-[450px]"
                    data-testid="preview-panel"
                    dangerouslySetInnerHTML={{ __html: previewHtml }}
                  />
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>
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
