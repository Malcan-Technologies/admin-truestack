import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Key, CreditCard, FileCheck, Settings } from "lucide-react";

export const dynamic = "force-dynamic";

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

async function getClient(id: string): Promise<Client | null> {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  const headersList = await headers();

  try {
    const response = await fetch(`${apiUrl}/api/admin/clients/${id}`, {
      headers: {
        cookie: headersList.get("cookie") || "",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      console.error("Failed to fetch client:", response.status);
      return null;
    }

    return response.json();
  } catch (error) {
    console.error("Error fetching client:", error);
    return null;
  }
}

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClient(id);

  if (!client) {
    notFound();
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/clients"
          className="inline-flex items-center text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Clients
        </Link>
      </div>

      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-white md:text-4xl">
              {client.name}
            </h1>
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
          <p className="mt-2 text-slate-400">
            <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-sm">
              {client.code}
            </code>
            <span className="mx-2">•</span>
            Created {new Date(client.created_at).toLocaleDateString()}
          </p>
        </div>
        <Button
          variant="outline"
          className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <Settings className="mr-2 h-4 w-4" />
          Edit Client
        </Button>
      </div>

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
                  <p className="text-white">{client.company_registration || "Not provided"}</p>
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
                    {Number(client.creditBalance || 0).toLocaleString()}
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
              <Button className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600">
                Generate Key
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">
                No API keys generated yet. Generate a key to enable API access for this client.
              </p>
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
              <Button className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600">
                Top Up Credits
              </Button>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-400">
                No transactions yet. Top up credits to enable KYC session creation.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
