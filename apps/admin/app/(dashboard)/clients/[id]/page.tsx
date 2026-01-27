import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Settings } from "lucide-react";
import { ClientDetailTabs } from "@/components/clients/client-detail-tabs";

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

      <ClientDetailTabs client={client} />
    </div>
  );
}
