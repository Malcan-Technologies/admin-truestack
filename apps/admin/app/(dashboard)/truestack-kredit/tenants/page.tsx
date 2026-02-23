"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Building2, RefreshCw } from "lucide-react";
import { apiClient, formatDate } from "@/lib/utils";
import { toast } from "sonner";

type TenantsResponse = {
  tenants: Array<{
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    type: string;
    licenseNumber: string | null;
    registrationNumber: string | null;
    email: string | null;
    contactNumber: string | null;
    businessAddress: string | null;
    status: string;
    subscriptionStatus: string;
    subscriptionAmount: number | null;
    subscribedAt: string | null;
    trueIdentityTenantSyncedAt: string | null;
    borrowerCount: number;
    applicationCount: number;
    loanCount: number;
    totalDisbursed: number;
    totalProfit: number;
    createdAt: string;
    updatedAt: string;
  }>;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

const DEFAULT_PAGE_SIZE = 20;

function formatRM(amount: number) {
  return `RM ${amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function KreditTenantsPage() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<TenantsResponse | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(DEFAULT_PAGE_SIZE),
      });
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      const response = await apiClient<{ success: boolean; data: TenantsResponse }>(
        `/api/admin/truestack-kredit/tenants?${params.toString()}`
      );
      setData(response.data);
    } catch (error) {
      console.error("Error fetching Kredit tenants:", error);
      toast.error("Failed to load Kredit tenants");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  return (
    <div>
      <PageHeader
        title="TrueKredit Tenants"
        description="All tenant information across TrueKredit."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={fetchTenants}
          disabled={loading}
          className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </PageHeader>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Tenants
            </CardTitle>
            <CardDescription className="text-slate-400">
              Search by name, slug, email, license, or registration number.
            </CardDescription>
          </div>
          <div className="w-80">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tenants..."
              className="border-slate-700 bg-slate-900 text-slate-100"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 text-slate-600 animate-spin" />
            </div>
          ) : (data?.tenants.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-400">No tenants found.</p>
          ) : (
            <TooltipProvider>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400">Tenant</TableHead>
                      <TableHead className="text-slate-400">Type</TableHead>
                      <TableHead className="text-slate-400">License / SSM</TableHead>
                      <TableHead className="text-slate-400">Contact</TableHead>
                      <TableHead className="text-slate-400">Status</TableHead>
                      <TableHead className="text-slate-400">Subscription</TableHead>
                      <TableHead className="text-slate-400">Borrowers</TableHead>
                      <TableHead className="text-slate-400">Apps</TableHead>
                      <TableHead className="text-slate-400">Loans</TableHead>
                      <TableHead className="text-slate-400">Disbursed</TableHead>
                      <TableHead className="text-slate-400">Profit</TableHead>
                      <TableHead className="text-slate-400">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.tenants.map((tenant) => (
                      <TableRow key={tenant.tenantId} className="border-slate-800">
                        <TableCell>
                          <div>
                            <p className="text-white font-medium">{tenant.tenantName}</p>
                            <p className="text-xs text-slate-500">{tenant.tenantSlug}</p>
                            {tenant.email && (
                              <p className="text-xs text-slate-500">{tenant.email}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="border-slate-500/30 bg-slate-700/40 text-slate-300">
                            {tenant.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-slate-300">
                            {tenant.licenseNumber || "-"}
                          </div>
                          {tenant.registrationNumber && (
                            <p className="text-xs text-slate-500">{tenant.registrationNumber}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-sm text-slate-300">
                            {tenant.contactNumber || "-"}
                          </p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={
                              tenant.status === "ACTIVE"
                                ? "border-green-500/30 bg-green-500/10 text-green-400"
                                : tenant.status === "SUSPENDED"
                                  ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                                  : "border-red-500/30 bg-red-500/10 text-red-400"
                            }
                          >
                            {tenant.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div>
                            <Badge
                              className={
                                tenant.subscriptionStatus === "PAID"
                                  ? "border-green-500/30 bg-green-500/10 text-green-400"
                                  : "border-slate-500/30 bg-slate-700/40 text-slate-400"
                              }
                            >
                              {tenant.subscriptionStatus}
                            </Badge>
                            {tenant.subscriptionAmount != null && (
                              <p className="text-xs text-slate-500 mt-1">
                                {formatRM(tenant.subscriptionAmount / 100)}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {tenant.borrowerCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {tenant.applicationCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {tenant.loanCount.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {formatRM(tenant.totalDisbursed)}
                        </TableCell>
                        <TableCell className="text-green-400">
                          {formatRM(tenant.totalProfit)}
                        </TableCell>
                        <TableCell>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="text-slate-400 cursor-help">
                                {formatDate(tenant.createdAt)}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              <p>Created: {formatDate(tenant.createdAt)}</p>
                              {tenant.subscribedAt && (
                                <p className="opacity-70 text-xs mt-1">
                                  Subscribed: {formatDate(tenant.subscribedAt)}
                                </p>
                              )}
                              {tenant.trueIdentityTenantSyncedAt && (
                                <p className="opacity-70 text-xs mt-1">
                                  TrueIdentity synced:{" "}
                                  {formatDate(tenant.trueIdentityTenantSyncedAt)}
                                </p>
                              )}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-slate-400">
                  {(data?.pagination.total ?? 0) === 0
                    ? "Showing 0 of 0"
                    : `Showing ${((data?.pagination.page ?? 1) - 1) * (data?.pagination.pageSize ?? DEFAULT_PAGE_SIZE) + 1}–${Math.min(
                        (data?.pagination.page ?? 1) * (data?.pagination.pageSize ?? DEFAULT_PAGE_SIZE),
                        data?.pagination.total ?? 0
                      )} of ${data?.pagination.total ?? 0}`}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={(data?.pagination.page ?? 1) <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={
                      (data?.pagination.page ?? 1) >= (data?.pagination.totalPages ?? 1) || loading
                    }
                    onClick={() => setPage((p) => p + 1)}
                    className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
