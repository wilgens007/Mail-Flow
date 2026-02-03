import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { getAuthHeaders, useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import {
  Save,
  User,
  Building2,
  Mail,
  Loader2,
} from "lucide-react";
import type { Tenant } from "@shared/schema";

const profileSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const tenantSchema = z.object({
  name: z.string().min(1, "Company name is required"),
  sendingFromName: z.string().optional(),
  replyToEmail: z.string().email("Invalid email").or(z.string().length(0)).optional(),
  companyAddress: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;
type TenantForm = z.infer<typeof tenantSchema>;

export default function SettingsPage() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
    },
  });

  const tenantForm = useForm<TenantForm>({
    resolver: zodResolver(tenantSchema),
    defaultValues: {
      name: user?.tenant?.name || "",
      sendingFromName: user?.tenant?.sendingFromName || "",
      replyToEmail: user?.tenant?.replyToEmail || "",
      companyAddress: user?.tenant?.companyAddress || "",
    },
  });

  useEffect(() => {
    if (user) {
      profileForm.reset({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
      });
      tenantForm.reset({
        name: user.tenant?.name || "",
        sendingFromName: user.tenant?.sendingFromName || "",
        replyToEmail: user.tenant?.replyToEmail || "",
        companyAddress: user.tenant?.companyAddress || "",
      });
    }
  }, [user]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: () => {
      refreshUser();
      toast({ title: "Profile updated" });
    },
    onError: (error) => {
      toast({
        title: "Failed to update profile",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  const updateTenantMutation = useMutation({
    mutationFn: async (data: TenantForm) => {
      const res = await fetch("/api/tenants/settings", {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update settings");
      }
      return res.json();
    },
    onSuccess: () => {
      refreshUser();
      toast({ title: "Settings updated" });
    },
    onError: (error) => {
      toast({
        title: "Failed to update settings",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Manage your account and company settings</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <User className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Profile</CardTitle>
              <CardDescription>Your personal information</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit(data => updateProfileMutation.mutate(data))} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <FormField
                  control={profileForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First name</FormLabel>
                      <FormControl>
                        <Input placeholder="John" data-testid="input-first-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={profileForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last name</FormLabel>
                      <FormControl>
                        <Input placeholder="Doe" data-testid="input-last-name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <FormLabel>Email</FormLabel>
                <Input value={user?.email || ""} disabled className="mt-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  Contact support to change your email address
                </p>
              </div>

              <Button 
                type="submit" 
                disabled={updateProfileMutation.isPending}
                data-testid="button-save-profile"
              >
                {updateProfileMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Profile
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-chart-2/10">
              <Building2 className="w-5 h-5 text-chart-2" />
            </div>
            <div>
              <CardTitle>Company Settings</CardTitle>
              <CardDescription>Your organization details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Form {...tenantForm}>
            <form onSubmit={tenantForm.handleSubmit(data => updateTenantMutation.mutate(data))} className="space-y-4">
              <FormField
                control={tenantForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company name</FormLabel>
                    <FormControl>
                      <Input placeholder="Acme Inc" data-testid="input-company-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Separator />

              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-chart-1/10">
                  <Mail className="w-5 h-5 text-chart-1" />
                </div>
                <div>
                  <h3 className="font-medium">Email Settings</h3>
                  <p className="text-sm text-muted-foreground">Configure your email sender details</p>
                </div>
              </div>

              <FormField
                control={tenantForm.control}
                name="sendingFromName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>From Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your Company" data-testid="input-from-name" {...field} />
                    </FormControl>
                    <FormDescription>
                      The name that appears in the "From" field of your emails
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={tenantForm.control}
                name="replyToEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reply-To Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="reply@yourcompany.com" data-testid="input-reply-to" {...field} />
                    </FormControl>
                    <FormDescription>
                      Recipients will reply to this address instead of the sending address
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={tenantForm.control}
                name="companyAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Address</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="123 Main St, Suite 100&#10;New York, NY 10001" 
                        data-testid="input-company-address"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Required for CAN-SPAM compliance. Will appear in email footer.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button 
                type="submit" 
                disabled={updateTenantMutation.isPending}
                data-testid="button-save-settings"
              >
                {updateTenantMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Save Settings
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
