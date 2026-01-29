"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { SearchFilterBar, FilterOption } from "@/components/ui/search-filter-bar";
import { formatDate } from "@/lib/utils";
import {
  Loader2,
  Plus,
  Copy,
  Check,
  RefreshCw,
  UserPlus,
  Shield,
  ShieldCheck,
  User,
  Pencil,
} from "lucide-react";
import { authClient, useSession } from "@/lib/auth-client";

// Admin roles available in the system
const ADMIN_ROLES = [
  { value: "admin", label: "Admin", description: "Full access to all features including user management" },
  { value: "ops", label: "Operations", description: "Manage clients and KYC sessions" },
  { value: "finance", label: "Finance", description: "View reports and manage credits" },
] as const;

type AdminRole = (typeof ADMIN_ROLES)[number]["value"] | "super_admin";

// Roles that have admin privileges (can manage other users)
const PRIVILEGED_ROLES = ["admin", "super_admin"];

const ROLE_FILTER_OPTIONS: FilterOption[] = [
  { value: "all", label: "All Roles" },
  { value: "admin", label: "Admin" },
  { value: "ops", label: "Operations" },
  { value: "finance", label: "Finance" },
];

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  createdAt: string;
  banned?: boolean | null;
}

// Generate a secure random password
function generateSecurePassword(length: number = 16): string {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*";
  const allChars = lowercase + uppercase + numbers + symbols;

  // Ensure at least one of each type
  let password = "";
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += symbols[Math.floor(Math.random() * symbols.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  // Shuffle the password
  return password
    .split("")
    .sort(() => Math.random() - 0.5)
    .join("");
}

function getRoleIcon(role: AdminRole | string) {
  switch (role) {
    case "admin":
    case "super_admin":
      return ShieldCheck;
    case "ops":
      return Shield;
    case "finance":
      return User;
    default:
      return User;
  }
}

function getRoleBadgeStyle(role: AdminRole | string) {
  switch (role) {
    case "admin":
    case "super_admin":
      return "border-red-500/30 bg-red-500/10 text-red-400";
    case "ops":
      return "border-indigo-500/30 bg-indigo-500/10 text-indigo-400";
    case "finance":
      return "border-green-500/30 bg-green-500/10 text-green-400";
    default:
      return "border-slate-500/30 bg-slate-500/10 text-slate-400";
  }
}

function getRoleLabel(role: string): string {
  if (role === "super_admin") return "Super Admin";
  const found = ADMIN_ROLES.find((r) => r.value === role);
  return found?.label || role;
}

export default function AdminUsersPage() {
  const { data: session } = useSession();
  const currentUser = session?.user;
  const userRole = (currentUser as { role?: string })?.role || "";
  const isAdmin = PRIVILEGED_ROLES.includes(userRole);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Filter users based on search and role
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Role filter
      if (roleFilter !== "all" && user.role !== roleFilter) {
        return false;
      }
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          user.name.toLowerCase().includes(searchLower) ||
          user.email.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [users, search, roleFilter]);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await authClient.admin.listUsers({
        query: {
          limit: 100,
          sortBy: "createdAt",
          sortDirection: "desc",
        },
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to fetch users");
      }

      setUsers(
        (result.data?.users || []).map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: (u.role as AdminRole) || "ops",
          createdAt: u.createdAt?.toString() || new Date().toISOString(),
          banned: u.banned,
        }))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin, fetchUsers]);

  if (!isAdmin) {
    return (
      <div>
        <PageHeader
          title="Admin Users"
          description="You don't have permission to view this page."
        />
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-slate-600" />
            <p className="mt-4 text-slate-400">
              Only users with the Admin role can manage admin users.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Admin Users"
        description="Manage admin users and their roles."
      >
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button className="bg-linear-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600">
              <Plus className="mr-2 h-4 w-4" />
              Add Admin User
            </Button>
          </DialogTrigger>
          <CreateAdminUserModal
            onSuccess={() => {
              setIsCreateModalOpen(false);
              fetchUsers();
            }}
            onClose={() => setIsCreateModalOpen(false)}
          />
        </Dialog>
      </PageHeader>

      {/* Search/Filter/Refresh Bar */}
      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or email..."
        filterValue={roleFilter}
        onFilterChange={setRoleFilter}
        filterOptions={ROLE_FILTER_OPTIONS}
        filterPlaceholder="Filter by role"
        onRefresh={fetchUsers}
        refreshing={loading}
        className="mb-6"
      />

      <Card className="border-slate-800 bg-slate-900/50">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-red-400">{error}</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={fetchUsers}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <UserPlus className="h-12 w-12 text-slate-600" />
              <p className="mt-4 text-slate-400">
                {users.length === 0 ? "No admin users yet." : "No users found."}
              </p>
              <p className="text-sm text-slate-500">
                {users.length === 0
                  ? "Create your first admin user to get started."
                  : "Try adjusting your search or filter criteria."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Name</TableHead>
                  <TableHead className="text-slate-400">Email</TableHead>
                  <TableHead className="text-slate-400">Role</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Created</TableHead>
                  <TableHead className="text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => {
                  const RoleIcon = getRoleIcon(user.role);
                  const isSelf = user.id === currentUser?.id;
                  const isSuperAdmin = user.role === "super_admin";
                  const canEdit = !isSelf && !isSuperAdmin;
                  return (
                    <TableRow
                      key={user.id}
                      className="border-slate-800 hover:bg-slate-800/50"
                    >
                      <TableCell className="font-medium text-white">
                        {user.name}
                        {isSelf && (
                          <Badge
                            variant="outline"
                            className="ml-2 border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                          >
                            You
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={getRoleBadgeStyle(user.role)}
                        >
                          <RoleIcon className="mr-1 h-3 w-3" />
                          {getRoleLabel(user.role)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.banned ? (
                          <Badge
                            variant="outline"
                            className="border-red-500/30 bg-red-500/10 text-red-400"
                          >
                            Banned
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="border-green-500/30 bg-green-500/10 text-green-400"
                          >
                            Active
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell>
                        {canEdit ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingUser(user)}
                            className="text-slate-400 hover:text-white"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span className="text-xs text-slate-500">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit User Modal */}
      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        {editingUser && (
          <EditUserModal
            user={editingUser}
            onSuccess={() => {
              setEditingUser(null);
              fetchUsers();
            }}
            onClose={() => setEditingUser(null)}
          />
        )}
      </Dialog>
    </div>
  );
}

interface CreateAdminUserModalProps {
  onSuccess: () => void;
  onClose: () => void;
}

function CreateAdminUserModal({ onSuccess, onClose }: CreateAdminUserModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("ops");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGeneratePassword = () => {
    const newPassword = generateSecurePassword(16);
    setPassword(newPassword);
  };

  const handleCopyPassword = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = await authClient.admin.createUser({
        name,
        email,
        password,
        role: role as any,
      });

      if (result.error) {
        throw new Error(result.error.message || "Failed to create user");
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <DialogContent className="border-slate-800 bg-slate-900 sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-white">Admin User Created</DialogTitle>
          <DialogDescription className="text-slate-400">
            The admin user has been created successfully.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4">
            <div className="flex items-center gap-2 text-green-400">
              <Check className="h-5 w-5" />
              <span className="font-medium">User created successfully!</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300">Login Credentials</Label>
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-3">
              <div>
                <p className="text-sm text-slate-400">Email</p>
                <p className="font-mono text-white">{email}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Password</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-slate-900 px-3 py-2 font-mono text-sm text-white">
                    {password}
                  </code>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyPassword}
                    className="border-slate-700"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <p className="text-xs text-amber-400">
              Make sure to save this password. It will not be shown again.
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <Button onClick={onSuccess} className="bg-indigo-600 hover:bg-indigo-700">
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="border-slate-800 bg-slate-900 sm:max-w-[500px]">
      <DialogHeader>
        <DialogTitle className="text-white">Add Admin User</DialogTitle>
        <DialogDescription className="text-slate-400">
          Create a new admin user with a specific role.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 py-4">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="name" className="text-slate-300">
            Name
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe"
            required
            className="border-slate-700 bg-slate-800/50 text-white placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-slate-300">
            Email
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            required
            className="border-slate-700 bg-slate-800/50 text-white placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="role" className="text-slate-300">
            Role
          </Label>
          <Select value={role} onValueChange={(v) => setRole(v as AdminRole)}>
            <SelectTrigger className="border-slate-700 bg-slate-800/50 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-900 min-w-[350px]">
              {ADMIN_ROLES.map((r) => (
                <SelectItem
                  key={r.value}
                  value={r.value}
                  className="text-white focus:bg-slate-800 focus:text-white py-3 [&>span]:items-start"
                >
                  <div className="flex flex-col gap-0.5 py-1">
                    <span className="font-medium">{r.label}</span>
                    <span className="text-xs text-slate-400 leading-relaxed">
                      {r.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="password" className="text-slate-300">
            Password
          </Label>
          <div className="flex gap-2">
            <Input
              id="password"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter or generate a password"
              required
              minLength={8}
              className="flex-1 border-slate-700 bg-slate-800/50 font-mono text-white placeholder:text-slate-500"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleGeneratePassword}
              className="border-slate-700 hover:bg-slate-800"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Generate
            </Button>
          </div>
          <p className="text-xs text-slate-500">
            Minimum 8 characters. Use the generate button for a secure password.
          </p>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-slate-700"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !name || !email || !password}
            className="bg-linear-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400 disabled:opacity-100"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Create User
              </>
            )}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}

interface EditUserModalProps {
  user: AdminUser;
  onSuccess: () => void;
  onClose: () => void;
}

function EditUserModal({ user, onSuccess, onClose }: EditUserModalProps) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<AdminRole>(user.role);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasChanges = name !== user.name || role !== user.role;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Update name if changed
      if (name !== user.name) {
        const nameResult = await authClient.admin.updateUser({
          userId: user.id,
          data: { name },
        });

        if (nameResult.error) {
          throw new Error(nameResult.error.message || "Failed to update name");
        }
      }

      // Update role if changed
      if (role !== user.role) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const roleResult = await authClient.admin.setRole({
          userId: user.id,
          role: role as any,
        });

        if (roleResult.error) {
          throw new Error(roleResult.error.message || "Failed to update role");
        }
      }

      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogContent className="border-slate-800 bg-slate-900 sm:max-w-[450px]">
      <DialogHeader>
        <DialogTitle className="text-white">Edit User</DialogTitle>
        <DialogDescription className="text-slate-400">
          Update details for {user.email}.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4 py-4">
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="edit-name" className="text-slate-300">
            Name
          </Label>
          <Input
            id="edit-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="User name"
            required
            className="border-slate-700 bg-slate-800/50 text-white placeholder:text-slate-500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="edit-role" className="text-slate-300">
            Role
          </Label>
          <Select value={role} onValueChange={(v) => setRole(v as AdminRole)}>
            <SelectTrigger className="border-slate-700 bg-slate-800/50 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-slate-700 bg-slate-900 min-w-[350px]">
              {ADMIN_ROLES.map((r) => (
                <SelectItem
                  key={r.value}
                  value={r.value}
                  className="text-white focus:bg-slate-800 focus:text-white py-3 [&>span]:items-start"
                >
                  <div className="flex flex-col gap-0.5 py-1">
                    <span className="font-medium">{r.label}</span>
                    <span className="text-xs text-slate-400 leading-relaxed">
                      {r.description}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="border-slate-700"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || !hasChanges || !name.trim()}
            className="bg-linear-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400 disabled:opacity-100"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </DialogContent>
  );
}
