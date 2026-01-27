"use client";

import { useSession } from "@/lib/auth-client";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage your account and system settings."
      />

      <div className="max-w-2xl space-y-6">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-white">Profile</CardTitle>
            <CardDescription className="text-slate-400">
              Your account information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-slate-400">Name</p>
              <p className="text-white">{user?.name || "Admin User"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Email</p>
              <p className="text-white">{user?.email || "Not available"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Role</p>
              <Badge
                variant="outline"
                className="border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
              >
                {(user as { role?: string })?.role || "ops"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-white">System Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-slate-400">Environment</p>
              <p className="text-white">
                {process.env.NODE_ENV === "production" ? "Production" : "Development"}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Version</p>
              <p className="text-white">1.0.0</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
