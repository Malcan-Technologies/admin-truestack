"use client";

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Eye,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  FileCheck,
} from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/utils";
import { toast } from "sonner";
import { KycSessionDetailModal } from "@/components/kyc/kyc-session-detail-modal";

type KycSession = {
  id: string;
  client_id: string;
  client_name: string;
  client_code: string;
  ref_id: string;
  innovatif_ref_id: string | null;
  status: string;
  result: string | null;
  reject_message: string | null;
  document_name: string;
  document_number: string;
  document_type: string;
  billed: boolean;
  webhook_delivered: boolean;
  webhook_delivered_at: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

function getStatusIcon(status: string, result: string | null) {
  if (status === "completed") {
    if (result === "approved") {
      return <CheckCircle className="h-4 w-4 text-green-400" />;
    } else {
      return <XCircle className="h-4 w-4 text-red-400" />;
    }
  }
  if (status === "expired") {
    return <AlertCircle className="h-4 w-4 text-orange-400" />;
  }
  return <Clock className="h-4 w-4 text-amber-400" />;
}

function getStatusBadge(status: string, result: string | null) {
  if (status === "completed") {
    if (result === "approved") {
      return (
        <Badge className="border-green-500/30 bg-green-500/10 text-green-400">
          Approved
        </Badge>
      );
    } else if (result === "rejected") {
      return (
        <Badge className="border-red-500/30 bg-red-500/10 text-red-400">
          Rejected
        </Badge>
      );
    }
  }

  const statusStyles: Record<string, string> = {
    pending: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
    processing: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    expired: "border-orange-500/30 bg-orange-500/10 text-orange-400",
    completed: "border-green-500/30 bg-green-500/10 text-green-400",
  };

  return (
    <Badge className={statusStyles[status] || statusStyles.pending}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<KycSession[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const fetchSessions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });

      if (search) {
        params.set("search", search);
      }

      if (statusFilter && statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const data = await apiClient<{
        sessions: KycSession[];
        pagination: Pagination;
      }>(`/api/admin/kyc-sessions?${params.toString()}`);

      setSessions(data.sessions);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching sessions:", error);
      toast.error("Failed to load sessions");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSessions(1);
  };

  const openSessionDetail = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setModalOpen(true);
  };

  return (
    <div>
      <PageHeader
        title="KYC Sessions"
        description="View and manage all TrueIdentity KYC verification sessions across all clients."
      />

      {/* Search/Filter Bar */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center">
        <form onSubmit={handleSearch} className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by name, number, or ref ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="border-slate-700 bg-slate-800 pl-10 text-white placeholder:text-slate-500"
          />
        </form>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px] border-slate-700 bg-slate-800 text-white">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent className="border-slate-700 bg-slate-800">
            <SelectItem value="all" className="text-white hover:bg-slate-700">
              All Statuses
            </SelectItem>
            <SelectItem value="approved" className="text-white hover:bg-slate-700">
              Approved
            </SelectItem>
            <SelectItem value="rejected" className="text-white hover:bg-slate-700">
              Rejected
            </SelectItem>
            <SelectItem value="pending" className="text-white hover:bg-slate-700">
              Pending
            </SelectItem>
            <SelectItem value="processing" className="text-white hover:bg-slate-700">
              Processing
            </SelectItem>
            <SelectItem value="expired" className="text-white hover:bg-slate-700">
              Expired
            </SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="outline"
          size="sm"
          onClick={() => fetchSessions(pagination.page)}
          disabled={loading}
          className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="h-8 w-8 text-slate-600 animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-12 text-center">
          <FileCheck className="mx-auto h-12 w-12 text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-white">No sessions found</h3>
          <p className="mt-2 text-sm text-slate-400">
            {search || statusFilter !== "all"
              ? "Try adjusting your search or filter criteria."
              : "KYC sessions will appear here once clients start using the API."}
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-slate-800">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 bg-slate-900 hover:bg-slate-900">
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Client</TableHead>
                  <TableHead className="text-slate-400">Ref ID</TableHead>
                  <TableHead className="text-slate-400">Document</TableHead>
                  <TableHead className="text-slate-400">Billed</TableHead>
                  <TableHead className="text-slate-400">Created</TableHead>
                  <TableHead className="text-right text-slate-400">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map((session) => (
                  <TableRow
                    key={session.id}
                    className="border-slate-800 cursor-pointer transition-colors hover:bg-indigo-500/5"
                    onClick={() => openSessionDetail(session.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(session.status, session.result)}
                        {getStatusBadge(session.status, session.result)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/clients/${session.client_id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="font-medium text-white hover:text-indigo-400"
                      >
                        {session.client_name}
                      </Link>
                      <p className="text-xs text-slate-500 font-mono">
                        {session.client_code}
                      </p>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-slate-300">
                      {session.ref_id}
                    </TableCell>
                    <TableCell className="text-slate-300">
                      <div>
                        <p className="text-sm">{session.document_name}</p>
                        <code className="text-xs text-slate-500 font-mono">
                          {session.document_number}
                        </code>
                      </div>
                    </TableCell>
                    <TableCell>
                      {session.billed ? (
                        <Badge className="border-green-500/30 bg-green-500/10 text-green-400">
                          <DollarSign className="mr-1 h-3 w-3" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge className="border-slate-500/30 bg-slate-500/10 text-slate-400">
                          No
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-slate-400">
                      {new Date(session.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          openSessionDetail(session.id);
                        }}
                        className="text-slate-400 hover:text-white"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4">
              <p className="text-sm text-slate-400">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} sessions
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchSessions(pagination.page - 1)}
                  disabled={pagination.page <= 1 || loading}
                  className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="flex items-center px-3 text-sm text-slate-400">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchSessions(pagination.page + 1)}
                  disabled={pagination.page >= pagination.totalPages || loading}
                  className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Session Detail Modal */}
      <KycSessionDetailModal
        sessionId={selectedSessionId}
        open={modalOpen}
        onOpenChange={setModalOpen}
      />
    </div>
  );
}
