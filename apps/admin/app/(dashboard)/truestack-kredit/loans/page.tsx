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
import { Banknote, RefreshCw } from "lucide-react";
import { apiClient, formatDate } from "@/lib/utils";
import { toast } from "sonner";

type LoansResponse = {
  loans: Array<{
    id: string;
    tenantId: string;
    tenant: { id: string; name: string; slug: string };
    borrowerId: string;
    borrower: { id: string; name: string; icNumber: string; email: string | null };
    principalAmount: number;
    interestRate: number;
    term: number;
    status: string;
    disbursementDate: string | null;
    createdAt: string;
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

function statusBadgeClass(status: string) {
  switch (status) {
    case "ACTIVE":
      return "border-green-500/30 bg-green-500/10 text-green-400";
    case "COMPLETED":
      return "border-slate-500/30 bg-slate-700/40 text-slate-300";
    case "IN_ARREARS":
      return "border-amber-500/30 bg-amber-500/10 text-amber-400";
    case "DEFAULTED":
    case "WRITTEN_OFF":
      return "border-red-500/30 bg-red-500/10 text-red-400";
    case "PENDING_DISBURSEMENT":
    default:
      return "border-slate-500/30 bg-slate-700/40 text-slate-400";
  }
}

export default function KreditLoansPage() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<LoansResponse | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchLoans = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(DEFAULT_PAGE_SIZE),
      });
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      const response = await apiClient<{ success: boolean; data: LoansResponse }>(
        `/api/admin/truestack-kredit/loans?${params.toString()}`
      );
      setData(response.data);
    } catch (error) {
      console.error("Error fetching Kredit loans:", error);
      toast.error("Failed to load Kredit loans");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    fetchLoans();
  }, [fetchLoans]);

  return (
    <div>
      <PageHeader
        title="TrueKredit Loans"
        description="All loans across all TrueKredit tenants and borrowers."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={fetchLoans}
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
              <Banknote className="h-5 w-5" />
              Loans
            </CardTitle>
            <CardDescription className="text-slate-400">
              Search by borrower or tenant.
            </CardDescription>
          </div>
          <div className="w-80">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search loans..."
              className="border-slate-700 bg-slate-900 text-slate-100"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 text-slate-600 animate-spin" />
            </div>
          ) : (data?.loans.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-400">No loans found.</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400">Borrower</TableHead>
                      <TableHead className="text-slate-400">Tenant</TableHead>
                      <TableHead className="text-slate-400">Principal</TableHead>
                      <TableHead className="text-slate-400">Rate</TableHead>
                      <TableHead className="text-slate-400">Term</TableHead>
                      <TableHead className="text-slate-400">Status</TableHead>
                      <TableHead className="text-slate-400">Disbursed</TableHead>
                      <TableHead className="text-slate-400">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data?.loans.map((loan) => (
                      <TableRow key={loan.id} className="border-slate-800">
                        <TableCell>
                          <p className="text-white font-medium">{loan.borrower.name}</p>
                          <p className="text-xs text-slate-500">{loan.borrower.icNumber}</p>
                          {loan.borrower.email && (
                            <p className="text-xs text-slate-500">{loan.borrower.email}</p>
                          )}
                        </TableCell>
                        <TableCell>
                          <p className="text-slate-200">{loan.tenant.name}</p>
                          <p className="text-xs text-slate-500">{loan.tenant.slug}</p>
                        </TableCell>
                        <TableCell className="text-slate-300 font-medium">
                          {formatRM(loan.principalAmount)}
                        </TableCell>
                        <TableCell className="text-slate-300">{loan.interestRate}%</TableCell>
                        <TableCell className="text-slate-300">{loan.term} mo</TableCell>
                        <TableCell>
                          <Badge className={statusBadgeClass(loan.status)}>
                            {loan.status.replace(/_/g, " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-400">
                          {loan.disbursementDate
                            ? formatDate(loan.disbursementDate)
                            : "-"}
                        </TableCell>
                        <TableCell className="text-slate-400">{formatDate(loan.createdAt)}</TableCell>
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
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
