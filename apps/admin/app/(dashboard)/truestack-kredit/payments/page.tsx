"use client";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle2, RefreshCw, XCircle } from "lucide-react";
import { apiClient, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

type PaymentItem = {
  id: string;
  requestId: string;
  tenantId: string;
  tenantSlug: string | null;
  tenantName: string | null;
  clientId: string | null;
  clientName: string | null;
  plan: string;
  amountCents: number;
  amountMyr: number;
  paymentReference: string;
  periodStart: string;
  periodEnd: string;
  requestedAt: string;
  requestedAddOns: string[];
  status: "pending" | "approved" | "rejected";
  rejectionReason: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  decisionWebhookDelivered: boolean;
  decisionWebhookAttempts: number;
  decisionWebhookLastError: string | null;
};

type PaymentsResponse = {
  items: PaymentItem[];
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

export default function KreditPaymentsPage() {
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">(
    "pending"
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<PaymentsResponse | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(DEFAULT_PAGE_SIZE),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const response = await apiClient<{ success: boolean; data: PaymentsResponse }>(
        `/api/admin/truestack-kredit/subscription-payments?${params.toString()}`
      );
      setData(response.data);
    } catch (error) {
      console.error("Error fetching subscription payments:", error);
      toast.error("Failed to load payment approvals");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, statusFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const approve = async (id: string) => {
    setProcessingId(id);
    try {
      const result = await apiClient<{
        success: boolean;
        webhook?: { delivered: boolean; error?: string | null };
      }>(`/api/admin/truestack-kredit/subscription-payments/${id}/approve`, {
        method: "POST",
      });
      if (result.webhook?.delivered) {
        toast.success("Payment approved and synced to Kredit");
      } else {
        toast.warning("Payment approved, but webhook delivery failed");
      }
      await fetchPayments();
    } catch (error) {
      console.error("Approve failed:", error);
      toast.error("Failed to approve payment");
    } finally {
      setProcessingId(null);
    }
  };

  const reject = async (id: string) => {
    const reason = window.prompt("Reason for rejection", "Payment could not be verified");
    if (reason === null) return;

    setProcessingId(id);
    try {
      const result = await apiClient<{
        success: boolean;
        webhook?: { delivered: boolean; error?: string | null };
      }>(`/api/admin/truestack-kredit/subscription-payments/${id}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      });
      if (result.webhook?.delivered) {
        toast.success("Payment rejected and synced to Kredit");
      } else {
        toast.warning("Payment rejected, but webhook delivery failed");
      }
      await fetchPayments();
    } catch (error) {
      console.error("Reject failed:", error);
      toast.error("Failed to reject payment");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="TrueKredit Payment Approvals"
        description="Approve or reject tenant subscription transfer confirmations."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={fetchPayments}
          disabled={loading}
          className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </PageHeader>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Subscription Payment Requests</CardTitle>
          <CardDescription className="text-slate-400">
            Pending requests are created when tenants click &quot;I&apos;ve Made the Transfer&quot; in TrueKredit.
          </CardDescription>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(["all", "pending", "approved", "rejected"] as const).map((status) => (
              <Button
                key={status}
                size="sm"
                variant={statusFilter === status ? "default" : "outline"}
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className={
                  statusFilter === status
                    ? ""
                    : "border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
                }
              >
                {status}
              </Button>
            ))}
            <div className="ml-auto w-80">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search request/tenant/reference..."
                className="border-slate-700 bg-slate-900 text-slate-100"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 text-slate-600 animate-spin" />
            </div>
          ) : (data?.items.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-400">No payment requests found.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Tenant</TableHead>
                    <TableHead className="text-slate-400">Request</TableHead>
                    <TableHead className="text-slate-400">Plan / Amount</TableHead>
                    <TableHead className="text-slate-400">Reference</TableHead>
                    <TableHead className="text-slate-400">Requested</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.items.map((item) => (
                    <TableRow key={item.id} className="border-slate-800">
                      <TableCell>
                        <p className="text-white font-medium">{item.tenantName || item.tenantSlug || item.tenantId}</p>
                        <p className="text-xs text-slate-500">{item.tenantSlug || item.tenantId}</p>
                        {item.clientName && <p className="text-xs text-slate-500">Client: {item.clientName}</p>}
                      </TableCell>
                      <TableCell>
                        <p className="text-slate-300 text-sm">{item.requestId}</p>
                        <p className="text-xs text-slate-500">
                          {item.periodStart.slice(0, 10)} to {item.periodEnd.slice(0, 10)}
                        </p>
                      </TableCell>
                      <TableCell>
                        <p className="text-slate-200">{item.plan}</p>
                        <p className="text-sm text-green-400">{formatRM(item.amountMyr)}</p>
                      </TableCell>
                      <TableCell className="text-slate-300">{item.paymentReference}</TableCell>
                      <TableCell className="text-slate-400">{formatDateTime(item.requestedAt)}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            item.status === "approved"
                              ? "border-green-500/30 bg-green-500/10 text-green-400"
                              : item.status === "rejected"
                              ? "border-red-500/30 bg-red-500/10 text-red-400"
                              : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                          }
                        >
                          {item.status}
                        </Badge>
                        {!item.decisionWebhookDelivered && item.decisionWebhookAttempts > 0 && (
                          <p className="text-xs text-amber-400 mt-1">
                            Delivery failed ({item.decisionWebhookAttempts} attempts)
                          </p>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => approve(item.id)}
                            disabled={item.status !== "pending" || processingId === item.id}
                            className="bg-green-600 text-white hover:bg-green-700"
                          >
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => reject(item.id)}
                            disabled={item.status !== "pending" || processingId === item.id}
                            className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          >
                            <XCircle className="mr-1 h-4 w-4" />
                            Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

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
                    disabled={(data?.pagination.page ?? 1) >= (data?.pagination.totalPages ?? 1) || loading}
                    onClick={() => setPage((p) => p + 1)}
                    className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
