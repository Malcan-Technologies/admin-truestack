"use client";

import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";
import { NewClientModal } from "./new-client-modal";

type Client = {
  id: string;
  name: string;
  code: string;
  status: "active" | "suspended";
  credit_balance: number;
  sessions_count: number;
  created_at: string;
};

interface ClientsListProps {
  clients: Client[];
}

export function ClientsList({ clients }: ClientsListProps) {
  return (
    <div>
      <PageHeader
        title="Clients"
        description="Manage your B2B clients and their API access."
      >
        <NewClientModal />
      </PageHeader>

      {clients.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-12 text-center">
          <h3 className="text-lg font-semibold text-white">No clients yet</h3>
          <p className="mt-2 text-sm text-slate-400">
            Create your first client to start issuing API keys and processing
            KYC sessions.
          </p>
          <div className="mt-4">
            <NewClientModal
              trigger={
                <Button className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600">
                  <Plus className="mr-2 h-4 w-4" />
                  Create First Client
                </Button>
              }
            />
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-800">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 bg-slate-900 hover:bg-slate-900">
                <TableHead className="text-slate-400">Name</TableHead>
                <TableHead className="text-slate-400">Code</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Credits</TableHead>
                <TableHead className="text-slate-400">Sessions</TableHead>
                <TableHead className="text-slate-400">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((client) => (
                <TableRow
                  key={client.id}
                  className="border-slate-800 transition-colors hover:bg-indigo-500/5"
                >
                  <TableCell>
                    <Link
                      href={`/clients/${client.id}`}
                      className="font-medium text-white hover:text-indigo-400"
                    >
                      {client.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-sm text-slate-300">
                      {client.code}
                    </code>
                  </TableCell>
                  <TableCell>
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
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {Number(client.credit_balance || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {Number(client.sessions_count || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-slate-400">
                    {new Date(client.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
