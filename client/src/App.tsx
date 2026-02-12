import { Switch, Route, useLocation, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth";
import { ThemeProvider } from "@/components/theme-provider";
import DashboardLayout from "@/components/dashboard-layout";

import LandingPage from "@/pages/landing";
import LoginPage from "@/pages/login";
import SignupPage from "@/pages/signup";
import DashboardPage from "@/pages/dashboard/index";
import ContactsPage from "@/pages/dashboard/contacts";
import CampaignsPage from "@/pages/dashboard/campaigns";
import CampaignEditorPage from "@/pages/dashboard/campaign-editor";
import CampaignViewPage from "@/pages/dashboard/campaign-view";
import CampaignSendPage from "@/pages/dashboard/campaign-send";
import BillingPage from "@/pages/dashboard/billing";
import SettingsPage from "@/pages/dashboard/settings";
import AnalyticsPage from "@/pages/dashboard/analytics";
import AdminTenantsPage from "@/pages/admin/tenants";
import AdminSystemPage from "@/pages/admin/system";
import ForgotPasswordPage from "@/pages/forgot-password";
import ResetPasswordPage from "@/pages/reset-password";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    setLocation("/login");
    return null;
  }

  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    setLocation("/dashboard");
    return null;
  }

  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (user) {
    setLocation("/dashboard");
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      
      <Route path="/login">
        <PublicRoute>
          <LoginPage />
        </PublicRoute>
      </Route>
      
      <Route path="/signup">
        <PublicRoute>
          <SignupPage />
        </PublicRoute>
      </Route>

      <Route path="/forgot-password">
        <PublicRoute>
          <ForgotPasswordPage />
        </PublicRoute>
      </Route>

      <Route path="/reset-password">
        <ResetPasswordPage />
      </Route>

      <Route path="/dashboard">
        <ProtectedRoute>
          <DashboardLayout>
            <DashboardPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard/contacts">
        <ProtectedRoute>
          <DashboardLayout>
            <ContactsPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard/campaigns">
        <ProtectedRoute>
          <DashboardLayout>
            <CampaignsPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard/campaigns/new">
        <ProtectedRoute>
          <DashboardLayout>
            <CampaignEditorPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard/campaigns/:id/edit">
        {(params) => (
          <ProtectedRoute>
            <DashboardLayout>
              <CampaignEditorPage campaignId={params.id} />
            </DashboardLayout>
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/dashboard/campaigns/:id/send">
        {(params) => (
          <ProtectedRoute>
            <DashboardLayout>
              <CampaignSendPage campaignId={params.id} />
            </DashboardLayout>
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/dashboard/campaigns/:id">
        {(params) => (
          <ProtectedRoute>
            <DashboardLayout>
              <CampaignViewPage campaignId={params.id} />
            </DashboardLayout>
          </ProtectedRoute>
        )}
      </Route>

      <Route path="/dashboard/billing">
        <ProtectedRoute>
          <DashboardLayout>
            <BillingPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard/settings">
        <ProtectedRoute>
          <DashboardLayout>
            <SettingsPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/dashboard/analytics">
        <ProtectedRoute>
          <DashboardLayout>
            <AnalyticsPage />
          </DashboardLayout>
        </ProtectedRoute>
      </Route>

      <Route path="/admin/tenants">
        <AdminRoute>
          <DashboardLayout>
            <AdminTenantsPage />
          </DashboardLayout>
        </AdminRoute>
      </Route>

      <Route path="/admin/system">
        <AdminRoute>
          <DashboardLayout>
            <AdminSystemPage />
          </DashboardLayout>
        </AdminRoute>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
