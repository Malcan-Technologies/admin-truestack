"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { SearchFilterBar, FilterOption } from "@/components/ui/search-filter-bar";
import { formatDate } from "@/lib/utils";
import { Building2, Plus } from "lucide-react";
import { NewClientModal } from "./new-client-modal";

type Client = {
  id: string;
  name: string;
  code: string;
  status: "active" | "suspended";
  credit_balance: number;
  sessions_count: number;
  billed_total: number;
  billed_mtd: number;
  created_at: string;
  unpaid_invoice_count: number;
  unpaid_amount_credits: number;
  has_overdue_invoice: boolean;
  oldest_overdue_days: number | null;
};

interface ClientsListProps {
  clients: Client[];
}

const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { value: "all", label: "All Statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
];

export function ClientsList({ clients: initialClients }: ClientsListProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);

  // Filter clients based on search and status
  const filteredClients = useMemo(() => {
    return initialClients.filter((client) => {
      // Status filter
      if (statusFilter !== "all" && client.status !== statusFilter) {
        return false;
      }

      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        return (
          client.name.toLowerCase().includes(searchLower) ||
          client.code.toLowerCase().includes(searchLower)
        );
      }

      return true;
    });
  }, [initialClients, search, statusFilter]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    router.refresh();
    // Add a small delay to show the spinner
    setTimeout(() => setRefreshing(false), 500);
  }, [router]);

  return (
    <div>
      <PageHeader
        title="Clients"
        description="Manage your B2B clients and their API access."
      >
        <NewClientModal />
      </PageHeader>

      {/* Search/Filter/Refresh Bar */}
      <SearchFilterBar
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name or code..."
        filterValue={statusFilter}
        onFilterChange={setStatusFilter}
        filterOptions={STATUS_FILTER_OPTIONS}
        filterPlaceholder="Filter by status"
        onRefresh={handleRefresh}
        refreshing={refreshing}
        className="mb-6"
      />

      {filteredClients.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-12 text-center">
          <Building2 className="mx-auto h-12 w-12 text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-white">
            {initialClients.length === 0 ? "No clients yet" : "No clients found"}
          </h3>
          <p className="mt-2 text-sm text-slate-400">
            {initialClients.length === 0
              ? "Create your first client to start issuing API keys and processing KYC sessions."
              : "Try adjusting your search or filter criteria."}
          </p>
          {initialClients.length === 0 && (
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
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-800">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 bg-slate-900 hover:bg-slate-900">
                <TableHead className="text-slate-400">Name</TableHead>
                <TableHead className="text-slate-400">Code</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Credits (10 = RM1)</TableHead>
                <TableHead className="text-slate-400">Unpaid</TableHead>
                <TableHead className="text-slate-400">Sessions</TableHead>
                <TableHead className="text-slate-400">Billed</TableHead>
                <TableHead className="text-slate-400">Billed (MTD)</TableHead>
                <TableHead className="text-slate-400">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
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
                  <TableCell>
                    <div>
                      <span className="text-slate-300">
                        {Number(client.credit_balance || 0).toLocaleString()} <br></br>
                      </span>
                      <span className="ml-1 text-xs text-slate-500">
                        (RM {((client.credit_balance || 0) / 10).toFixed(2)})
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {(client.unpaid_amount_credits || 0) > 0 ? (
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={
                            client.has_overdue_invoice
                              ? "border-red-500/30 bg-red-500/10 text-red-400"
                              : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                          }
                        >
                          RM {((client.unpaid_amount_credits || 0) / 10).toFixed(2)}
                        </Badge>
                        {client.has_overdue_invoice && client.oldest_overdue_days && (
                          <span className="text-xs text-red-400">
                            {client.oldest_overdue_days}d overdue
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-500">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {Number(client.sessions_count || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {Number(client.billed_total || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-green-400 font-medium">
                    {Number(client.billed_mtd || 0).toLocaleString()}
                  </TableCell>
                  <TableCell className="text-slate-400">
                    {formatDate(client.created_at)}
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
