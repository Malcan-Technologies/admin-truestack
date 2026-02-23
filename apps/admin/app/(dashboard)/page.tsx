"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AreaChartComponent,
  BarChartComponent,
  ChartDataPoint,
  ChartSeries,
} from "@/components/ui/chart";
import {
  Users,
  FileCheck,
  CreditCard,
  Activity,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  DollarSign,
  Building2,
} from "lucide-react";
import { apiClient, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

type DashboardStats = {
  overview: {
    totalClients: number;
    activeClients: number;
    totalSessions: number;
    approvedSessions: number;
    rejectedSessions: number;
    pendingSessions: number;
    totalCreditsUsed: number;
    billedMtd: number;
    successRate: number;
  };
  sessionsChart: ChartDataPoint[];
  creditsChart: ChartDataPoint[];
  recentSessions: Array<{
    id: string;
    client_name: string;
    status: string;
    result: string | null;
    document_name: string;
    created_at: string;
  }>;
  recentClients: Array<{
    id: string;
    name: string;
    code: string;
    status: string;
    created_at: string;
  }>;
};

const sessionsSeries: ChartSeries[] = [
  { key: "approved", name: "Approved", color: "#22c55e" },
  { key: "rejected", name: "Rejected", color: "#ef4444" },
];

const creditsSeries: ChartSeries[] = [
  { key: "added", name: "Credits Added", color: "#6366f1" },
  { key: "used", name: "Credits Used", color: "#f59e0b" },
];

function getStatusIcon(status: string, result: string | null) {
  if (status === "completed") {
    return result === "approved" ? (
      <CheckCircle className="h-4 w-4 text-green-400" />
    ) : (
      <XCircle className="h-4 w-4 text-red-400" />
    );
  }
  return <Clock className="h-4 w-4 text-amber-400" />;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"daily" | "monthly">("daily");

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient<DashboardStats>(
        `/api/admin/dashboard/stats?period=${period}`
      );
      setStats(data);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const handleRefresh = () => {
    fetchStats();
    toast.success("Data refreshed");
  };

  return (
    <div>
      <PageHeader
        title="Overview"
        description="TrueIdentity KYC platform metrics and recent activity."
      >
        <div className="flex items-center gap-3">
          <Select value={period} onValueChange={(v) => setPeriod(v as "daily" | "monthly")}>
            <SelectTrigger className="w-[140px] border-slate-700 bg-slate-800 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-800">
              <SelectItem value="daily" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                Last 30 Days
              </SelectItem>
              <SelectItem value="monthly" className="text-white hover:bg-slate-700 focus:bg-slate-700">
                Last 12 Months
              </SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={loading}
            className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </PageHeader>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Clients"
          value={stats?.overview.totalClients.toLocaleString() || "0"}
          icon={Users}
        />
        <StatsCard
          title="Total Sessions"
          value={stats?.overview.totalSessions.toLocaleString() || "0"}
          icon={FileCheck}
        />
        <StatsCard
          title="Credits Used"
          value={stats?.overview.totalCreditsUsed.toLocaleString() || "0"}
          icon={CreditCard}
        />
        <StatsCard
          title="Success Rate"
          value={stats?.overview.successRate ? `${stats.overview.successRate}%` : "--"}
          icon={Activity}
        />
      </div>

      {/* TrueIdentity Section */}
      <div className="mb-8">
        <div className="mb-4 flex items-center gap-2">
          <div className="h-8 w-1 rounded-full bg-linear-to-b from-indigo-500 to-violet-500" />
          <h2 className="text-xl font-semibold text-white">TrueIdentity</h2>
        </div>

        {/* Session Stats Cards - Compact */}
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
            <CheckCircle className="h-4 w-4 text-green-400" />
            <span className="text-xs text-slate-400">Approved</span>
            <span className="ml-auto text-lg font-semibold text-green-400">
              {stats?.overview.approvedSessions.toLocaleString() || "0"}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
            <XCircle className="h-4 w-4 text-red-400" />
            <span className="text-xs text-slate-400">Rejected</span>
            <span className="ml-auto text-lg font-semibold text-red-400">
              {stats?.overview.rejectedSessions.toLocaleString() || "0"}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
            <Clock className="h-4 w-4 text-amber-400" />
            <span className="text-xs text-slate-400">Pending</span>
            <span className="ml-auto text-lg font-semibold text-amber-400">
              {stats?.overview.pendingSessions.toLocaleString() || "0"}
            </span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2">
            <DollarSign className="h-4 w-4 text-indigo-400" />
            <span className="text-xs text-slate-400">Billed MTD</span>
            <span className="ml-auto text-lg font-semibold text-indigo-400">
              {stats?.overview.billedMtd.toLocaleString() || "0"}
            </span>
          </div>
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium text-white">
                <TrendingUp className="h-4 w-4 text-indigo-400" />
                Sessions Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-[300px] items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-slate-500" />
                </div>
              ) : stats?.sessionsChart && stats.sessionsChart.length > 0 ? (
                <AreaChartComponent
                  data={stats.sessionsChart}
                  series={sessionsSeries}
                  height={300}
                  showLegend
                />
              ) : (
                <div className="flex h-[300px] items-center justify-center text-slate-500">
                  No session data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-base font-medium text-white">
                <CreditCard className="h-4 w-4 text-indigo-400" />
                Credits Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex h-[300px] items-center justify-center">
                  <RefreshCw className="h-6 w-6 animate-spin text-slate-500" />
                </div>
              ) : stats?.creditsChart && stats.creditsChart.length > 0 ? (
                <BarChartComponent
                  data={stats.creditsChart}
                  series={creditsSeries}
                  height={300}
                  showLegend
                />
              ) : (
                <div className="flex h-[300px] items-center justify-center text-slate-500">
                  No credits data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium text-white">
                Recent KYC Sessions
              </CardTitle>
              <Link href="/true-identity/sessions">
                <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-300">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-slate-500" />
              </div>
            ) : stats?.recentSessions && stats.recentSessions.length > 0 ? (
              <div className="space-y-3">
                {stats.recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/30 p-3"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(session.status, session.result)}
                      <div>
                        <p className="text-sm font-medium text-white">
                          {session.document_name || "Unknown"}
                        </p>
                        <p className="text-xs text-slate-400">{session.client_name}</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500">
                      {formatDateTime(session.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <FileCheck className="h-8 w-8 text-slate-600" />
                <p className="mt-2 text-sm text-slate-400">No sessions yet</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-medium text-white">Recent Clients</CardTitle>
              <Link href="/clients">
                <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-300">
                  View All
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin text-slate-500" />
              </div>
            ) : stats?.recentClients && stats.recentClients.length > 0 ? (
              <div className="space-y-3">
                {stats.recentClients.map((client) => (
                  <Link key={client.id} href={`/clients/${client.id}`}>
                    <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-800/30 p-3 transition-colors hover:bg-slate-800/50">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-indigo-500/10 p-2">
                          <Building2 className="h-4 w-4 text-indigo-400" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{client.name}</p>
                          <p className="text-xs text-slate-400 font-mono">{client.code}</p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          client.status === "active"
                            ? "border-green-500/30 bg-green-500/10 text-green-400"
                            : "border-red-500/30 bg-red-500/10 text-red-400"
                        }
                      >
                        {client.status}
                      </Badge>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Building2 className="h-8 w-8 text-slate-600" />
                <p className="mt-2 text-sm text-slate-400">No clients yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
