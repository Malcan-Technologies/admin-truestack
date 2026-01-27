import { PageHeader } from "@/components/layout/page-header";
import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileCheck, CheckCircle, XCircle, Clock } from "lucide-react";

export default function UsagePage() {
  return (
    <div>
      <PageHeader
        title="Usage"
        description="TrueIdentity usage analytics and statistics."
      />

      {/* Stats Grid */}
      <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Sessions"
          value="0"
          icon={FileCheck}
        />
        <StatsCard
          title="Approved"
          value="0"
          icon={CheckCircle}
        />
        <StatsCard
          title="Rejected"
          value="0"
          icon={XCircle}
        />
        <StatsCard
          title="Pending"
          value="0"
          icon={Clock}
        />
      </div>

      {/* Usage by Client */}
      <Card className="border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Usage by Client</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400">
            No usage data yet. Statistics will appear here once clients start processing KYC sessions.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
