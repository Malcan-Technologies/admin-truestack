import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CreditCard, ShieldCheck, Users } from "lucide-react";

export default function TrueStackKreditPage() {
  return (
    <div>
      <PageHeader
        title="TrueStack Kredit"
        description="Dedicated workspace for TrueStack Kredit operations and future management tools."
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Users className="h-5 w-5 text-indigo-400" />
              Tenant Clients
            </CardTitle>
            <CardDescription>View all clients created via TrueStack Kredit source.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="border-slate-700 bg-transparent hover:bg-slate-800">
              <Link href="/clients?source=truestack_kredit">Open filtered clients</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <CreditCard className="h-5 w-5 text-indigo-400" />
              Billing
            </CardTitle>
            <CardDescription>Future module for tenant billing, reconciliation, and payment controls.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-400">Coming soon.</CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <ShieldCheck className="h-5 w-5 text-indigo-400" />
              Access & Controls
            </CardTitle>
            <CardDescription>Future module for API access, tenant permissions, and policy controls.</CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-slate-400">Coming soon.</CardContent>
        </Card>
      </div>
    </div>
  );
}
