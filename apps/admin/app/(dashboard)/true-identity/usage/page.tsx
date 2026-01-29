"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileCheck,
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  RefreshCw,
  CreditCard,
  TrendingUp,
  Building2,
} from "lucide-react";
import { apiClient } from "@/lib/utils";
import { toast } from "sonner";

type UsageStats = {
  totalSessions: number;
  approvedSessions: number;
  rejectedSessions: number;
  pendingSessions: number;
  processingSessions: number;
  expiredSessions: number;
  billedTotal: number;
  billedMtd: number;
  totalCreditsBalance: number;
};

type ClientUsage = {
  clientId: string;
  clientName: string;
  clientCode: string;
  totalSessions: number;
  approvedSessions: number;
  rejectedSessions: number;
  pendingSessions: number;
  billedTotal: number;
  billedMtd: number;
  creditBalance: number;
};

export default function UsagePage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [clientUsage, setClientUsage] = useState<ClientUsage[]>([]);

  const fetchUsage = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<{
        stats: UsageStats;
        clientUsage: ClientUsage[];
      }>("/api/admin/kyc-usage");

      setStats(data.stats);
      setClientUsage(data.clientUsage);
    } catch (error) {
      console.error("Error fetching usage:", error);
      toast.error("Failed to load usage data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  const currentMonth = new Date().toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  if (loading) {
    return (
      <div>
        <PageHeader
          title="Usage"
          description="TrueIdentity usage analytics and statistics."
        />
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-slate-600 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Usage"
        description="TrueIdentity usage analytics and statistics across all clients."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={fetchUsage}
          disabled={loading}
          className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </PageHeader>

      {/* Main Stats Grid */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Sessions"
          value={stats?.totalSessions.toLocaleString() || "0"}
          icon={FileCheck}
        />
        <StatsCard
          title="Approved"
          value={stats?.approvedSessions.toLocaleString() || "0"}
          icon={CheckCircle}
        />
        <StatsCard
          title="Rejected"
          value={stats?.rejectedSessions.toLocaleString() || "0"}
          icon={XCircle}
        />
        <StatsCard
          title="Pending"
          value={(
            (stats?.pendingSessions || 0) + (stats?.processingSessions || 0)
          ).toLocaleString()}
          icon={Clock}
        />
      </div>

      {/* Billing Stats */}
      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Billed Sessions (All Time)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">
              {stats?.billedTotal.toLocaleString() || "0"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Billed Sessions (MTD)
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              {currentMonth}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-400">
              {stats?.billedMtd.toLocaleString() || "0"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-400 flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Total Credits Balance
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Across all clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <p className="text-3xl font-bold text-white">
                {stats?.totalCreditsBalance.toLocaleString() || "0"}
              </p>
              <p className="text-sm text-slate-400">
                (RM {((stats?.totalCreditsBalance || 0) / 10).toFixed(2)})
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Usage by Client */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Usage by Client
          </CardTitle>
          <CardDescription className="text-slate-400">
            Breakdown of KYC sessions and billing by client
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientUsage.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileCheck className="h-12 w-12 text-slate-600 mb-4" />
              <p className="text-slate-400">No usage data yet</p>
              <p className="text-sm text-slate-500">
                Statistics will appear here once clients start processing KYC sessions.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Client</TableHead>
                  <TableHead className="text-slate-400">Total Sessions</TableHead>
                  <TableHead className="text-slate-400">Approved</TableHead>
                  <TableHead className="text-slate-400">Rejected</TableHead>
                  <TableHead className="text-slate-400">Pending</TableHead>
                  <TableHead className="text-slate-400">Billed (All)</TableHead>
                  <TableHead className="text-slate-400">Billed (MTD)</TableHead>
                  <TableHead className="text-slate-400">Credits Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientUsage.map((client) => (
                  <TableRow
                    key={client.clientId}
                    className="border-slate-800 transition-colors hover:bg-indigo-500/5"
                  >
                    <TableCell>
                      <Link
                        href={`/clients/${client.clientId}`}
                        className="font-medium text-white hover:text-indigo-400"
                      >
                        {client.clientName}
                      </Link>
                      <p className="text-xs text-slate-500 font-mono">
                        {client.clientCode}
                      </p>
                    </TableCell>
                    <TableCell className="text-slate-300 font-medium">
                      {client.totalSessions.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge className="border-green-500/30 bg-green-500/10 text-green-400">
                        {client.approvedSessions.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="border-red-500/30 bg-red-500/10 text-red-400">
                        {client.rejectedSessions.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400">
                        {client.pendingSessions.toLocaleString()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-300">
                      {client.billedTotal.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-green-400 font-medium">
                      {client.billedMtd.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <span className="text-slate-300">
                          {client.creditBalance.toLocaleString()}
                        </span>
                        <span className="ml-1 text-xs text-slate-500">
                          (RM {(client.creditBalance / 10).toFixed(2)})
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
