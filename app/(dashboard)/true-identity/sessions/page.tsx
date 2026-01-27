import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

// Mock data - in production this would be fetched from database
const sessions: Array<{
  id: string;
  clientName: string;
  documentName: string;
  documentNumber: string;
  status: "pending" | "processing" | "completed" | "expired";
  result: "approved" | "rejected" | null;
  createdAt: string;
}> = [];

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

  const statusStyles = {
    pending: "border-yellow-500/30 bg-yellow-500/10 text-yellow-400",
    processing: "border-blue-500/30 bg-blue-500/10 text-blue-400",
    expired: "border-slate-500/30 bg-slate-500/10 text-slate-400",
    completed: "border-green-500/30 bg-green-500/10 text-green-400",
  };

  return (
    <Badge className={statusStyles[status as keyof typeof statusStyles]}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function SessionsPage() {
  return (
    <div>
      <PageHeader
        title="KYC Sessions"
        description="View and manage all TrueIdentity KYC verification sessions."
      />

      {/* Search/Filter Bar */}
      <div className="mb-6 flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by document name or number..."
            className="border-slate-700 bg-slate-800 pl-10 text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-12 text-center">
          <h3 className="text-lg font-semibold text-white">No sessions yet</h3>
          <p className="mt-2 text-sm text-slate-400">
            KYC sessions will appear here once clients start using the API.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-slate-800">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-800 bg-slate-900 hover:bg-slate-900">
                <TableHead className="text-slate-400">Client</TableHead>
                <TableHead className="text-slate-400">Document Name</TableHead>
                <TableHead className="text-slate-400">Document Number</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
                <TableHead className="text-slate-400">Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sessions.map((session) => (
                <TableRow
                  key={session.id}
                  className="border-slate-800 transition-colors hover:bg-indigo-500/5"
                >
                  <TableCell className="font-medium text-white">
                    {session.clientName}
                  </TableCell>
                  <TableCell className="text-slate-300">
                    {session.documentName}
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-sm text-slate-300">
                      {session.documentNumber}
                    </code>
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(session.status, session.result)}
                  </TableCell>
                  <TableCell className="text-slate-400">
                    {new Date(session.createdAt).toLocaleString()}
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
