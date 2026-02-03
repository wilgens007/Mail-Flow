import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { getAuthHeaders } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Building2,
  MoreHorizontal,
  Ban,
  CheckCircle,
  Mail,
  Users,
  Eye,
} from "lucide-react";
import type { Tenant } from "@shared/schema";
import { PLAN_LIMITS } from "@shared/schema";

interface TenantWithDetails extends Tenant {
  userCount: number;
  contactCount: number;
  plan: string;
}

export default function AdminTenantsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [selectedTenant, setSelectedTenant] = useState<TenantWithDetails | null>(null);

  const { data: tenants, isLoading } = useQuery<TenantWithDetails[]>({
    queryKey: ["/api/admin/tenants"],
    queryFn: async () => {
      const res = await fetch("/api/admin/tenants", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch tenants");
      return res.json();
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "active" | "disabled" }) => {
      const res = await fetch(`/api/admin/tenants/${id}/status`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update tenant status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/tenants"] });
      toast({ title: "Tenant status updated" });
    },
    onError: () => {
      toast({ title: "Failed to update status", variant: "destructive" });
    },
  });

  const filteredTenants = tenants?.filter(tenant =>
    tenant.name.toLowerCase().includes(search.toLowerCase())
  ) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tenants</h1>
        <p className="text-muted-foreground">Manage all tenant accounts</p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Total Tenants</div>
                <div className="text-2xl font-bold">{tenants?.length ?? 0}</div>
              </div>
              <div className="p-2 rounded-lg bg-chart-1/10">
                <Building2 className="w-5 h-5 text-chart-1" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Active</div>
                <div className="text-2xl font-bold text-chart-3">
                  {tenants?.filter(t => t.status === "active").length ?? 0}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-chart-3/10">
                <CheckCircle className="w-5 h-5 text-chart-3" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-muted-foreground">Disabled</div>
                <div className="text-2xl font-bold text-destructive">
                  {tenants?.filter(t => t.status === "disabled").length ?? 0}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-destructive/10">
                <Ban className="w-5 h-5 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search tenants..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                data-testid="input-search-tenants"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No tenants found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead className="hidden sm:table-cell">Plan</TableHead>
                    <TableHead className="hidden md:table-cell">Users</TableHead>
                    <TableHead className="hidden md:table-cell">Contacts</TableHead>
                    <TableHead className="hidden lg:table-cell">Emails</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTenants.map((tenant) => (
                    <TableRow key={tenant.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Building2 className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-medium truncate">{tenant.name}</div>
                            <div className="text-sm text-muted-foreground truncate">
                              Created {new Date(tenant.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <Badge variant="secondary">
                          {PLAN_LIMITS[tenant.plan as keyof typeof PLAN_LIMITS]?.name || tenant.plan}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {tenant.userCount}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {tenant.contactCount.toLocaleString()}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {tenant.emailsSentThisMonth.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {tenant.status === "active" ? (
                          <Badge variant="secondary" className="gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Active
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <Ban className="w-3 h-3" />
                            Disabled
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedTenant(tenant)}>
                              <Eye className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {tenant.status === "active" ? (
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => toggleStatusMutation.mutate({ id: tenant.id, status: "disabled" })}
                              >
                                <Ban className="w-4 h-4 mr-2" />
                                Disable Tenant
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem
                                onClick={() => toggleStatusMutation.mutate({ id: tenant.id, status: "active" })}
                              >
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Enable Tenant
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedTenant} onOpenChange={() => setSelectedTenant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedTenant?.name}</DialogTitle>
            <DialogDescription>Tenant details and statistics</DialogDescription>
          </DialogHeader>
          {selectedTenant && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Users</div>
                  <div className="text-xl font-bold">{selectedTenant.userCount}</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Contacts</div>
                  <div className="text-xl font-bold">{selectedTenant.contactCount.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Emails This Month</div>
                  <div className="text-xl font-bold">{selectedTenant.emailsSentThisMonth.toLocaleString()}</div>
                </div>
                <div className="p-4 bg-muted/50 rounded-lg">
                  <div className="text-sm text-muted-foreground">Plan</div>
                  <div className="text-xl font-bold">
                    {PLAN_LIMITS[selectedTenant.plan as keyof typeof PLAN_LIMITS]?.name || selectedTenant.plan}
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Status</span>
                  <span className={selectedTenant.status === "active" ? "text-chart-3" : "text-destructive"}>
                    {selectedTenant.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">From Name</span>
                  <span>{selectedTenant.sendingFromName || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reply-To</span>
                  <span>{selectedTenant.replyToEmail || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span>{new Date(selectedTenant.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedTenant(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
