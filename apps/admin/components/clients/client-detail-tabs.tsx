"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Key, CreditCard, FileCheck, Copy, Eye, EyeOff, Ban } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { GenerateApiKeyModal } from "./generate-api-key-modal";
import { TopupCreditsModal } from "./topup-credits-modal";
import { apiClient } from "@/lib/utils";

type Client = {
  id: string;
  name: string;
  code: string;
  status: "active" | "suspended";
  contact_email: string | null;
  contact_phone: string | null;
  company_registration: string | null;
  notes: string | null;
  created_at: string;
  creditBalance: number;
  sessionsCount: number;
};

type ApiKey = {
  id: string;
  product_id: string;
  product_name: string;
  api_key_prefix: string;
  api_key_suffix: string;
  key: string;
  environment: string;
  status: string;
  created_at: string;
  revoked_at: string | null;
  displayKey: string;
};

type CreditEntry = {
  id: string;
  amount: number;
  balance_after: number;
  type: string;
  reference_id: string | null;
  description: string | null;
  created_at: string;
  created_by_name: string | null;
};

interface ClientDetailTabsProps {
  client: Client;
}

export function ClientDetailTabs({ client }: ClientDetailTabsProps) {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [creditEntries, setCreditEntries] = useState<CreditEntry[]>([]);
  const [creditBalance, setCreditBalance] = useState(client.creditBalance);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [loadingCredits, setLoadingCredits] = useState(true);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  const toggleKeyVisibility = (keyId: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) {
        next.delete(keyId);
      } else {
        next.add(keyId);
      }
      return next;
    });
  };

  const copyApiKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    toast.success("API key copied to clipboard");
  };

  const revokeApiKey = async (keyId: string) => {
    try {
      await apiClient(`/api/admin/clients/${client.id}/api-keys/${keyId}`, {
        method: "DELETE",
      });
      // Refresh the API keys list
      await refreshApiKeys();
      toast.success("API key revoked");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to revoke API key");
    }
  };

  const refreshApiKeys = async () => {
    const updatedKeys = await apiClient<ApiKey[]>(`/api/admin/clients/${client.id}/api-keys`);
    setApiKeys(updatedKeys);
  };

  useEffect(() => {
    // Fetch API keys
    apiClient<ApiKey[]>(`/api/admin/clients/${client.id}/api-keys`)
      .then(setApiKeys)
      .catch(console.error)
      .finally(() => setLoadingKeys(false));

    // Fetch credit ledger
    apiClient<{ balance: number; entries: CreditEntry[] }>(
      `/api/admin/clients/${client.id}/credits`
    )
      .then((data) => {
        setCreditBalance(data.balance);
        setCreditEntries(data.entries);
      })
      .catch(console.error)
      .finally(() => setLoadingCredits(false));
  }, [client.id]);

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="border-slate-800 bg-slate-900">
        <TabsTrigger
          value="overview"
          className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400"
        >
          Overview
        </TabsTrigger>
        <TabsTrigger
          value="api-keys"
          className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400"
        >
          <Key className="mr-2 h-4 w-4" />
          API Keys
        </TabsTrigger>
        <TabsTrigger
          value="true-identity"
          className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400"
        >
          <FileCheck className="mr-2 h-4 w-4" />
          TrueIdentity
        </TabsTrigger>
        <TabsTrigger
          value="billing"
          className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400"
        >
          <CreditCard className="mr-2 h-4 w-4" />
          Billing
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-white">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-slate-400">Email</p>
                <p className="text-white">{client.contact_email || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Phone</p>
                <p className="text-white">{client.contact_phone || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Company Registration</p>
                <p className="text-white">
                  {client.company_registration || "Not provided"}
                </p>
              </div>
              {client.notes && (
                <div>
                  <p className="text-sm text-slate-400">Internal Notes</p>
                  <p className="text-white">{client.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-white">Usage Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Credit Balance</span>
                <span className="text-2xl font-semibold text-white">
                  {creditBalance.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Sessions</span>
                <span className="text-2xl font-semibold text-white">
                  {Number(client.sessionsCount || 0).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="api-keys">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white">API Keys</CardTitle>
              <CardDescription className="text-slate-400">
                Manage API keys for this client. Each product has its own key.
              </CardDescription>
            </div>
            <GenerateApiKeyModal clientId={client.id} onKeyGenerated={refreshApiKeys} />
          </CardHeader>
          <CardContent>
            {loadingKeys ? (
              <p className="text-sm text-slate-400">Loading API keys...</p>
            ) : apiKeys.length === 0 ? (
              <p className="text-sm text-slate-400">
                No API keys generated yet. Generate a key to enable API access for
                this client.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Key</TableHead>
                    <TableHead className="text-slate-400">Product</TableHead>
                    <TableHead className="text-slate-400">Environment</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Created</TableHead>
                    <TableHead className="text-slate-400">Revoked</TableHead>
                    <TableHead className="text-right text-slate-400">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {apiKeys.map((apiKey) => (
                    <TableRow key={apiKey.id} className="border-slate-800">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <code className={`rounded bg-slate-800 px-2 py-1 font-mono text-sm ${apiKey.status === "revoked" ? "text-slate-500 line-through" : "text-slate-300"}`}>
                            {revealedKeys.has(apiKey.id) ? apiKey.key : apiKey.displayKey}
                          </code>
                          {apiKey.status === "active" && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-400 hover:text-white"
                                onClick={() => toggleKeyVisibility(apiKey.id)}
                              >
                                {revealedKeys.has(apiKey.id) ? (
                                  <EyeOff className="h-3.5 w-3.5" />
                                ) : (
                                  <Eye className="h-3.5 w-3.5" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-slate-400 hover:text-white"
                                onClick={() => copyApiKey(apiKey.key)}
                              >
                                <Copy className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {apiKey.product_name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            apiKey.environment === "live"
                              ? "border-green-500/30 bg-green-500/10 text-green-400"
                              : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                          }
                        >
                          {apiKey.environment}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            apiKey.status === "active"
                              ? "border-green-500/30 bg-green-500/10 text-green-400"
                              : "border-red-500/30 bg-red-500/10 text-red-400"
                          }
                        >
                          {apiKey.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {new Date(apiKey.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {apiKey.revoked_at
                          ? new Date(apiKey.revoked_at).toLocaleString()
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {apiKey.status === "active" && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                              >
                                <Ban className="mr-1.5 h-3.5 w-3.5" />
                                Revoke
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent className="border-slate-800 bg-slate-900">
                              <AlertDialogHeader>
                                <AlertDialogTitle className="text-white">
                                  Revoke API Key?
                                </AlertDialogTitle>
                                <AlertDialogDescription className="text-slate-400">
                                  This will immediately invalidate the API key. Any
                                  applications using this key will no longer be able to
                                  authenticate. This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <div className="my-2 rounded-md bg-slate-800 p-3">
                                <code className="font-mono text-sm text-slate-300">
                                  {apiKey.displayKey}
                                </code>
                              </div>
                              <AlertDialogFooter>
                                <AlertDialogCancel className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white">
                                  Cancel
                                </AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => revokeApiKey(apiKey.id)}
                                  className="bg-red-600 text-white hover:bg-red-700"
                                >
                                  Revoke Key
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="true-identity">
        <div className="space-y-6">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-white">TrueIdentity Configuration</CardTitle>
              <CardDescription className="text-slate-400">
                Configure webhook URLs and redirect settings for KYC sessions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">
                Configuration options will be available here.
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-white">Recent KYC Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">
                No sessions yet for this client.
              </p>
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <TabsContent value="billing">
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white">Credit Ledger</CardTitle>
              <CardDescription className="text-slate-400">
                View credit transactions and top-up history.
              </CardDescription>
            </div>
            <TopupCreditsModal
              clientId={client.id}
              clientName={client.name}
              currentBalance={creditBalance}
            />
          </CardHeader>
          <CardContent>
            <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Current Balance</span>
                <span className="text-2xl font-semibold text-white">
                  {creditBalance.toLocaleString()}
                </span>
              </div>
            </div>

            {loadingCredits ? (
              <p className="text-sm text-slate-400">Loading transactions...</p>
            ) : creditEntries.length === 0 ? (
              <p className="text-sm text-slate-400">
                No transactions yet. Top up credits to enable KYC session creation.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead className="text-slate-400">Date</TableHead>
                    <TableHead className="text-slate-400">Type</TableHead>
                    <TableHead className="text-slate-400">Description</TableHead>
                    <TableHead className="text-right text-slate-400">Amount</TableHead>
                    <TableHead className="text-right text-slate-400">Balance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {creditEntries.map((entry) => (
                    <TableRow key={entry.id} className="border-slate-800">
                      <TableCell className="text-slate-400">
                        {new Date(entry.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            entry.type === "topup"
                              ? "border-green-500/30 bg-green-500/10 text-green-400"
                              : entry.type === "included"
                              ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                              : entry.type === "usage"
                              ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                              : entry.type === "refund"
                              ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                              : "border-slate-500/30 bg-slate-500/10 text-slate-400"
                          }
                        >
                          {entry.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {entry.description || "-"}
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          entry.amount >= 0 ? "text-green-400" : "text-red-400"
                        }`}
                      >
                        {entry.amount >= 0 ? "+" : ""}
                        {entry.amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-slate-300">
                        {entry.balance_after.toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
