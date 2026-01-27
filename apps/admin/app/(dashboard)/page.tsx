import { PageHeader } from "@/components/layout/page-header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Users, FileCheck, CreditCard, Activity } from "lucide-react";

export default function DashboardPage() {
  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Overview of your platform metrics and recent activity."
      />

      {/* Stats Grid */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Clients"
          value="0"
          icon={Users}
        />
        <StatsCard
          title="KYC Sessions Today"
          value="0"
          icon={FileCheck}
        />
        <StatsCard
          title="Total Credits Used"
          value="0"
          icon={CreditCard}
        />
        <StatsCard
          title="Success Rate"
          value="--"
          icon={Activity}
        />
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-white">Recent KYC Sessions</h3>
          <p className="mt-2 text-sm text-slate-400">
            No sessions yet. Sessions will appear here once clients start using the API.
          </p>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-6">
          <h3 className="text-lg font-semibold text-white">Recent Clients</h3>
          <p className="mt-2 text-sm text-slate-400">
            No clients yet. Create your first client to get started.
          </p>
        </div>
      </div>
    </div>
  );
}
