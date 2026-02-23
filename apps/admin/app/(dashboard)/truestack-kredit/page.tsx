"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, DollarSign, FileText, HandCoins, RefreshCw, Users, Wallet } from "lucide-react";
import { MonthlyGrowthChart } from "@/components/ui/chart";
import { apiClient } from "@/lib/utils";
import { toast } from "sonner";

type OverviewResponse = {
  summary: {
    tenantCount: number;
    totalBorrowers: number;
    totalApplications: number;
    totalLoans: number;
    totalDisbursedFacilitated: number;
    totalOutstanding: number;
    totalProfit: number;
  };
  monthlyGrowthChart: Array<{ label: string; tenants: number; loanVolume: number }>;
};

function formatRM(amount: number) {
  return `RM ${amount.toLocaleString("en-MY", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TrueKreditPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<OverviewResponse | null>(null);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient<{ success: boolean; data: OverviewResponse }>(
        "/api/admin/truestack-kredit/overview"
      );
      setData(response.data);
    } catch (error) {
      console.error("Error fetching Kredit overview:", error);
      toast.error("Failed to load Kredit overview");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  return (
    <div>
      <PageHeader
        title="TrueKredit"
        description="Cross-tenant Kredit analytics and portfolio monitoring."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={fetchOverview}
          disabled={loading}
          className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </PageHeader>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Total Tenants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{(data?.summary.tenantCount ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Borrowers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{(data?.summary.totalBorrowers ?? 0).toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Total Tenant Loans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{(data?.summary.totalLoans ?? 0).toLocaleString()}</p>
            <p className="text-slate-400 text-sm mt-1">
              {(data?.summary.totalApplications ?? 0).toLocaleString()} applications
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <HandCoins className="h-4 w-4" />
              Total Loan Volume Facilitated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">
              {formatRM(data?.summary.totalDisbursedFacilitated ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Total Tenant Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-white">
              {formatRM(data?.summary.totalOutstanding ?? 0)}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Tenant Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-400">
              {formatRM(data?.summary.totalProfit ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-6 border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Monthly Growth</CardTitle>
          <CardDescription className="text-slate-400">
            Cumulative tenants and loan volume facilitated over the last 12 months.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.monthlyGrowthChart && data.monthlyGrowthChart.length > 0 ? (
            <MonthlyGrowthChart data={data.monthlyGrowthChart} height={300} />
          ) : (
            <div className="flex h-[300px] items-center justify-center text-slate-400">
              No chart data available
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-4">
        <Link
          href="/truestack-kredit/tenants"
          className="text-sm text-indigo-400 hover:text-indigo-300"
        >
          View all tenants
        </Link>
        <Link
          href="/clients?source=truestack_kredit"
          className="text-sm text-indigo-400 hover:text-indigo-300"
        >
          View TrueIdentity clients
        </Link>
      </div>
    </div>
  );
}
