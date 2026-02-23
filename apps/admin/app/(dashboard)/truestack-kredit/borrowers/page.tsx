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
import { RefreshCw, Users } from "lucide-react";
import { apiClient, formatDate } from "@/lib/utils";
import { toast } from "sonner";

type BorrowersResponse = {
  borrowers: Array<{
    id: string;
    name: string;
    borrowerType: string;
    icNumber: string;
    email: string | null;
    phone: string | null;
    tenant: {
      id: string;
      name: string;
      slug: string;
    };
    loanCount: number;
    applicationCount: number;
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

export default function KreditBorrowersPage() {
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<BorrowersResponse | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchBorrowers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(DEFAULT_PAGE_SIZE),
      });
      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      const response = await apiClient<{ success: boolean; data: BorrowersResponse }>(
        `/api/admin/truestack-kredit/borrowers?${params.toString()}`
      );
      setData(response.data);
    } catch (error) {
      console.error("Error fetching Kredit borrowers:", error);
      toast.error("Failed to load Kredit borrowers");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, page]);

  useEffect(() => {
    fetchBorrowers();
  }, [fetchBorrowers]);

  return (
    <div>
      <PageHeader
        title="TrueKredit Borrowers"
        description="All borrowers across all TrueKredit tenants."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={fetchBorrowers}
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
              <Users className="h-5 w-5" />
              Borrowers
            </CardTitle>
            <CardDescription className="text-slate-400">
              Search by borrower name, IC/passport, phone, email, or tenant details.
            </CardDescription>
          </div>
          <div className="w-80">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search borrowers..."
              className="border-slate-700 bg-slate-900 text-slate-100"
            />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-8 w-8 text-slate-600 animate-spin" />
            </div>
          ) : (data?.borrowers.length ?? 0) === 0 ? (
            <p className="text-sm text-slate-400">No borrowers found.</p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Borrower</TableHead>
                    <TableHead className="text-slate-400">Tenant</TableHead>
                    <TableHead className="text-slate-400">Type</TableHead>
                    <TableHead className="text-slate-400">IC/Doc</TableHead>
                    <TableHead className="text-slate-400">Loans</TableHead>
                    <TableHead className="text-slate-400">Applications</TableHead>
                    <TableHead className="text-slate-400">Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.borrowers.map((borrower) => (
                    <TableRow key={borrower.id} className="border-slate-800">
                      <TableCell>
                        <p className="text-white font-medium">{borrower.name}</p>
                        <p className="text-xs text-slate-500">{borrower.email || borrower.phone || "-"}</p>
                      </TableCell>
                      <TableCell>
                        <p className="text-slate-200">{borrower.tenant.name}</p>
                        <p className="text-xs text-slate-500">{borrower.tenant.slug}</p>
                      </TableCell>
                      <TableCell>
                        <Badge className="border-slate-500/30 bg-slate-700/40 text-slate-300">
                          {borrower.borrowerType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">{borrower.icNumber}</TableCell>
                      <TableCell className="text-slate-300">{borrower.loanCount.toLocaleString()}</TableCell>
                      <TableCell className="text-slate-300">{borrower.applicationCount.toLocaleString()}</TableCell>
                      <TableCell className="text-slate-400">{formatDate(borrower.createdAt)}</TableCell>
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
