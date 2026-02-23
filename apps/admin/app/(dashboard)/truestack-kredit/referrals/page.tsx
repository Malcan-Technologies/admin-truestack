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
import { CheckCircle2, Gift, RefreshCw, Users, Wallet } from "lucide-react";
import { apiClient, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

type Referrer = {
  id: string;
  email: string;
  name: string;
};

type ReferredUser = {
  id: string;
  email: string;
  name: string;
};

type Referral = {
  id: string;
  referralCode: string;
  rewardAmount: number;
  rewardAmountMyr: number;
  isEligible: boolean;
  isPaid: boolean;
  eligibleAt: string;
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
  referrer: Referrer;
  referredUser: ReferredUser;
};

type Summary = {
  total: number;
  eligible: number;
  paid: number;
  unpaidEligible: number;
  totalRewards: number;
  paidRewards: number;
};

type ReferralsResponse = {
  referrals: Referral[];
  summary: Summary;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
};

const DEFAULT_PAGE_SIZE = 20;

function formatRM(cents: number) {
  return `RM ${(cents / 100).toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function KreditReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "eligible" | "paid" | "pending">("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ReferralsResponse | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchReferrals = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(DEFAULT_PAGE_SIZE),
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);

      const response = await apiClient<{ success: boolean; data: ReferralsResponse }>(
        `/api/admin/truestack-kredit/referrals?${params.toString()}`
      );
      setData(response.data);
    } catch (error) {
      console.error("Error fetching referrals:", error);
      toast.error("Failed to load referrals");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page, statusFilter]);

  useEffect(() => {
    fetchReferrals();
  }, [fetchReferrals]);

  const markAsPaid = async (id: string) => {
    setProcessingId(id);
    try {
      const result = await apiClient<{
        success: boolean;
        webhook?: { delivered: boolean; error?: string | null };
      }>(`/api/admin/truestack-kredit/referrals/${id}/mark-paid`, {
        method: "POST",
      });
      if (result.webhook?.delivered) {
        toast.success("Referral marked as paid and synced to Kredit");
      } else {
        toast.warning("Referral marked as paid, but webhook delivery failed");
      }
      await fetchReferrals();
    } catch (error) {
      console.error("Mark as paid failed:", error);
      toast.error("Failed to mark referral as paid");
    } finally {
      setProcessingId(null);
    }
  };

  const getStatusBadge = (referral: Referral) => {
    if (referral.isPaid) {
      return (
        <Badge className="border-green-500/30 bg-green-500/10 text-green-400">
          Paid
        </Badge>
      );
    }
    if (referral.isEligible) {
      return (
        <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400">
          Eligible
        </Badge>
      );
    }
    return (
      <Badge className="border-slate-500/30 bg-slate-500/10 text-slate-400">
        Pending
      </Badge>
    );
  };

  return (
    <div>
      <PageHeader
        title="TrueKredit Referrals"
        description="Manage referral rewards across all users."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={fetchReferrals}
          disabled={loading}
          className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </PageHeader>

      {/* Summary Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Referrals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{(data?.summary.total ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <Gift className="h-4 w-4" />
              Eligible for Payout
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-400">{(data?.summary.eligible ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Paid Out
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-400">{(data?.summary.paid ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Total Rewards Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">
              {formatRM((data?.summary.totalRewards ?? 0) * 100)}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {formatRM((data?.summary.paidRewards ?? 0) * 100)} paid
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Referrals</CardTitle>
          <CardDescription className="text-slate-400">
            View and manage referral rewards. Mark eligible referrals as paid after sending rewards.
          </CardDescription>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {(["all", "eligible", "paid", "pending"] as const).map((status) => (
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
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
            <div className="ml-auto w-80">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by code, email, or name..."
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
          ) : (data?.referrals.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-400">No referrals found.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Referrer</TableHead>
                    <TableHead className="text-slate-400">Referred User</TableHead>
                    <TableHead className="text-slate-400">Referral Code</TableHead>
                    <TableHead className="text-slate-400">Reward</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Eligible/Paid Date</TableHead>
                    <TableHead className="text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.referrals.map((referral) => (
                    <TableRow key={referral.id} className="border-slate-800">
                      <TableCell>
                        <p className="text-white font-medium">{referral.referrer.name || "-"}</p>
                        <p className="text-xs text-slate-500">{referral.referrer.email}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-slate-200">{referral.referredUser.name || "-"}</p>
                        <p className="text-xs text-slate-500">{referral.referredUser.email}</p>
                      </TableCell>
                      <TableCell>
                        <code className="px-2 py-1 bg-slate-800 rounded text-xs text-slate-300">
                          {referral.referralCode}
                        </code>
                      </TableCell>
                      <TableCell>
                        <p className="text-green-400 font-medium">{formatRM(referral.rewardAmount)}</p>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(referral)}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {referral.isPaid ? (
                          <span>Paid: {formatDateTime(referral.paidAt!)}</span>
                        ) : referral.isEligible ? (
                          <span>Eligible: {formatDateTime(referral.eligibleAt)}</span>
                        ) : (
                          <span>Created: {formatDateTime(referral.createdAt)}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {referral.isEligible && !referral.isPaid && (
                          <Button
                            size="sm"
                            onClick={() => markAsPaid(referral.id)}
                            disabled={processingId === referral.id}
                            className="bg-green-600 text-white hover:bg-green-700"
                          >
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            Mark Paid
                          </Button>
                        )}
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
