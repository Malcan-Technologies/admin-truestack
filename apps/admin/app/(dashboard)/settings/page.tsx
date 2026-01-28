"use client";

import { useState } from "react";
import { useSession, changePassword, updateUser } from "@/lib/auth-client";
import { PageHeader } from "@/components/layout/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Check, Lock, RefreshCw, Pencil, X, Save } from "lucide-react";
import { apiClient } from "@/lib/utils";

// Helper to format role for display
function formatRole(role: string): string {
  const roleLabels: Record<string, string> = {
    super_admin: "Super Admin",
    admin: "Admin",
    ops: "Operations",
    finance: "Finance",
  };
  return roleLabels[role] || role;
}

export default function SettingsPage() {
  const { data: session } = useSession();
  const user = session?.user;
  const userRole = (user as { role?: string })?.role || "ops";

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Name editing state
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState("");
  const [nameLoading, setNameLoading] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSuccess, setNameSuccess] = useState(false);

  // Role migration state
  const [migrateLoading, setMigrateLoading] = useState(false);
  const [migrateError, setMigrateError] = useState<string | null>(null);
  const [migrateSuccess, setMigrateSuccess] = useState(false);

  const handleStartEditName = () => {
    setEditedName(user?.name || "");
    setIsEditingName(true);
    setNameError(null);
    setNameSuccess(false);
  };

  const handleCancelEditName = () => {
    setIsEditingName(false);
    setEditedName("");
    setNameError(null);
  };

  const handleSaveName = async () => {
    if (!editedName.trim()) {
      setNameError("Name cannot be empty");
      return;
    }

    setNameLoading(true);
    setNameError(null);

    try {
      const result = await updateUser({
        name: editedName.trim(),
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to update name");
      }

      setNameSuccess(true);
      setIsEditingName(false);
    } catch (err) {
      setNameError(
        err instanceof Error ? err.message : "Failed to update name"
      );
    } finally {
      setNameLoading(false);
    }
  };

  const handleMigrateRole = async () => {
    setMigrateLoading(true);
    setMigrateError(null);
    setMigrateSuccess(false);

    try {
      await apiClient<{ success: boolean; message: string }>(
        "/api/admin/migrate-role",
        { method: "POST" }
      );
      setMigrateSuccess(true);
    } catch (err) {
      setMigrateError(
        err instanceof Error ? err.message : "Failed to migrate role"
      );
    } finally {
      setMigrateLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    // Validation
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (newPassword === currentPassword) {
      setError("New password must be different from current password");
      return;
    }

    setLoading(true);

    try {
      const result = await changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to change password");
      }

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to change password"
      );
    } finally {
      setLoading(false);
    }
  };

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
              {isEditingName ? (
                <div className="mt-1 flex items-center gap-2">
                  <Input
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    placeholder="Enter your name"
                    className="max-w-xs border-slate-700 bg-slate-800/50 text-white placeholder:text-slate-500"
                  />
                  <Button
                    size="sm"
                    onClick={handleSaveName}
                    disabled={nameLoading}
                    className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:opacity-100"
                  >
                    {nameLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEditName}
                    disabled={nameLoading}
                    className="border-slate-700"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <p className="text-white">{user?.name || "Admin User"}</p>
                  <button
                    onClick={handleStartEditName}
                    className="text-slate-400 transition-colors hover:text-white"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              )}
              {nameError && (
                <p className="mt-1 text-sm text-red-400">{nameError}</p>
              )}
              {nameSuccess && (
                <p className="mt-1 text-sm text-green-400">
                  Name updated successfully.
                </p>
              )}
            </div>
            <div>
              <p className="text-sm text-slate-400">Email</p>
              <p className="text-white">{user?.email || "Not available"}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Role</p>
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className="border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                >
                  {formatRole(userRole)}
                </Badge>
                {userRole === "super_admin" && !migrateSuccess && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleMigrateRole}
                    disabled={migrateLoading}
                    className="border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:text-amber-300"
                  >
                    {migrateLoading ? (
                      <>
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        Migrating...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Migrate to Admin
                      </>
                    )}
                  </Button>
                )}
              </div>
              {migrateError && (
                <p className="mt-2 text-sm text-red-400">{migrateError}</p>
              )}
              {migrateSuccess && (
                <p className="mt-2 text-sm text-green-400">
                  Role migrated successfully. Please log out and log back in.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Lock className="h-5 w-5" />
              Change Password
            </CardTitle>
            <CardDescription className="text-slate-400">
              Update your password to keep your account secure.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {success && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3">
                  <div className="flex items-center gap-2 text-green-400">
                    <Check className="h-4 w-4" />
                    <p className="text-sm">Password changed successfully!</p>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-slate-300">
                  Current Password
                </Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter your current password"
                  required
                  className="border-slate-700 bg-slate-800/50 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-slate-300">
                  New Password
                </Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                  required
                  minLength={8}
                  className="border-slate-700 bg-slate-800/50 text-white placeholder:text-slate-500"
                />
                <p className="text-xs text-slate-500">
                  Minimum 8 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-slate-300">
                  Confirm New Password
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your new password"
                  required
                  minLength={8}
                  className="border-slate-700 bg-slate-800/50 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={
                    loading || !currentPassword || !newPassword || !confirmPassword
                  }
                  className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400 disabled:opacity-100"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Changing Password...
                    </>
                  ) : (
                    <>
                      <Lock className="mr-2 h-4 w-4" />
                      Change Password
                    </>
                  )}
                </Button>
              </div>
            </form>
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
                {process.env.NODE_ENV === "production"
                  ? "Production"
                  : "Development"}
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
