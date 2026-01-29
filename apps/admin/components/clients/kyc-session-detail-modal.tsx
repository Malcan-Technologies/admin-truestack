"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle,
  XCircle,
  Clock,
  FileCheck,
  User,
  Eye,
  Webhook,
  RefreshCw,
  DollarSign,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { apiClient, formatDateTime } from "@/lib/utils";
import { toast } from "sonner";

type KycSessionDetail = {
  id: string;
  ref_id: string;
  innovatif_ref_id: string | null;
  innovatif_onboarding_id: string | null;
  status: string;
  result: string | null;
  reject_message: string | null;
  document_name: string;
  document_number: string;
  document_type: string;
  platform: string;
  webhook_url: string | null;
  redirect_url: string | null;
  metadata: Record<string, unknown>;
  billed: boolean;
  webhook_delivered: boolean;
  webhook_delivered_at: string | null;
  webhook_attempts: number;
  webhook_last_error: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  document: {
    full_name?: string | null;
    id_number?: string | null;
    id_number_back?: string | null;
    address?: string | null;
    gender?: string | null;
    dob?: string | null;
    nationality?: string | null;
    religion?: string | null;
    race?: string | null;
  } | null;
  verification: {
    document_valid?: boolean | null;
    name_match?: boolean | null;
    id_match?: boolean | null;
    front_back_match?: boolean | null;
    landmark_valid?: boolean | null;
    face_match?: boolean | null;
    face_match_score?: number | null;
    liveness_passed?: boolean | null;
  } | null;
  images: {
    front_document?: string;
    back_document?: string;
    face_image?: string;
    best_frame?: string;
  } | null;
  _raw?: Record<string, unknown>;
};

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  "1": "MyKad",
  "2": "MyTentera",
  "3": "Passport",
  "4": "MyKid",
  "5": "MyPR",
  "6": "MyKas",
};

interface KycSessionDetailModalProps {
  sessionId: string | null;
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function KycSessionDetailModal({
  sessionId,
  clientId,
  open,
  onOpenChange,
}: KycSessionDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [session, setSession] = useState<KycSessionDetail | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const fetchSession = async () => {
    if (!sessionId) return;
    setLoading(true);
    try {
      const data = await apiClient<KycSessionDetail>(
        `/api/admin/clients/${clientId}/kyc-sessions/${sessionId}`
      );
      setSession(data);
    } catch (error) {
      console.error("Failed to load session:", error);
      toast.error("Failed to load session details");
    } finally {
      setLoading(false);
    }
  };

  const refreshFromProvider = async () => {
    if (!sessionId) return;
    setRefreshing(true);
    try {
      const result = await apiClient<{
        success: boolean;
        refreshed: boolean;
        images_uploaded?: Record<string, boolean>;
        error?: string;
      }>(`/api/admin/kyc-sessions/${sessionId}/refresh`, {
        method: "POST",
      });
      
      if (result.success) {
        toast.success("Session refreshed from provider");
        // Reload session data to show updated info
        await fetchSession();
      } else {
        toast.error(result.error || "Failed to refresh from provider");
      }
    } catch (error) {
      console.error("Failed to refresh session:", error);
      toast.error("Failed to refresh session from provider");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (open && sessionId) {
      setSession(null);
      setActiveTab("overview");
      fetchSession();
    }
  }, [open, sessionId, clientId]);

  const getStatusIcon = (status: string, result: string | null) => {
    if (status === "completed") {
      if (result === "approved") {
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      } else {
        return <XCircle className="h-5 w-5 text-red-400" />;
      }
    }
    if (status === "expired") {
      return <AlertCircle className="h-5 w-5 text-orange-400" />;
    }
    return <Clock className="h-5 w-5 text-amber-400" />;
  };

  const getStatusBadge = (status: string, result: string | null) => {
    if (status === "completed") {
      return result === "approved" ? (
        <Badge className="border-green-500/30 bg-green-500/10 text-green-400">
          Approved
        </Badge>
      ) : (
        <Badge className="border-red-500/30 bg-red-500/10 text-red-400">
          Rejected
        </Badge>
      );
    }
    if (status === "pending") {
      return (
        <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400">
          Pending
        </Badge>
      );
    }
    if (status === "processing") {
      return (
        <Badge className="border-blue-500/30 bg-blue-500/10 text-blue-400">
          Processing
        </Badge>
      );
    }
    if (status === "expired") {
      return (
        <Badge className="border-orange-500/30 bg-orange-500/10 text-orange-400">
          Expired
        </Badge>
      );
    }
    return (
      <Badge className="border-slate-500/30 bg-slate-500/10 text-slate-400">
        {status}
      </Badge>
    );
  };

  const VerificationCheck = ({
    label,
    value,
  }: {
    label: string;
    value: boolean | null | undefined;
  }) => (
    <div className="flex items-center justify-between">
      <span className="text-slate-400 text-sm">{label}</span>
      {value === null || value === undefined ? (
        <span className="text-slate-500">-</span>
      ) : value ? (
        <CheckCircle className="h-4 w-4 text-green-400" />
      ) : (
        <XCircle className="h-4 w-4 text-red-400" />
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="6xl" className="border-slate-800 bg-slate-900 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white flex items-center gap-3">
              {session && getStatusIcon(session.status, session.result)}
              KYC Session Details
            </DialogTitle>
            {session && (
              <Button
                variant="outline"
                size="sm"
                onClick={refreshFromProvider}
                disabled={refreshing}
                className="border-indigo-500/30 bg-transparent text-indigo-300 hover:bg-indigo-500/10"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
                {refreshing ? "Refreshing..." : "Refresh from Provider"}
              </Button>
            )}
          </div>
          <DialogDescription className="text-slate-400">
            {session ? (
              <span className="font-mono">{session.ref_id}</span>
            ) : (
              "Loading session details..."
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-slate-600 animate-spin" />
          </div>
        ) : session ? (
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="border-slate-800 bg-slate-900/50">
              <TabsTrigger
                value="overview"
                className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400"
              >
                <User className="mr-2 h-4 w-4" />
                Overview
              </TabsTrigger>
              <TabsTrigger
                value="verification"
                className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400"
              >
                <FileCheck className="mr-2 h-4 w-4" />
                Verification
              </TabsTrigger>
              <TabsTrigger
                value="images"
                className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400"
              >
                <Eye className="mr-2 h-4 w-4" />
                Images
              </TabsTrigger>
              <TabsTrigger
                value="webhook"
                className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400"
              >
                <Webhook className="mr-2 h-4 w-4" />
                Webhook
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="mt-4 space-y-4">
              {/* Status Banner */}
              <div className="flex items-center gap-4 p-4 rounded-lg border border-slate-700 bg-slate-800/50">
                {getStatusIcon(session.status, session.result)}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-white">
                    {session.status === "completed"
                      ? session.result === "approved"
                        ? "Verification Approved"
                        : "Verification Rejected"
                      : session.status === "pending"
                      ? "Waiting for User"
                      : session.status === "expired"
                      ? "Session Expired"
                      : "Processing"}
                  </h3>
                  {session.reject_message && (
                    <p className="text-sm text-red-400">
                      {session.reject_message}
                    </p>
                  )}
                </div>
                {getStatusBadge(session.status, session.result)}
              </div>

              {/* Session Details Grid */}
              <div className="grid gap-4 md:grid-cols-2">
                {/* Document Info */}
                <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4 space-y-3">
                  <h4 className="text-sm font-medium text-slate-300">
                    Document Information
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Name</span>
                      <span className="text-white">{session.document_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Number</span>
                      <span className="text-white font-mono">
                        {session.document_number}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Type</span>
                      <span className="text-white">
                        {DOCUMENT_TYPE_LABELS[session.document_type] ||
                          session.document_type}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Platform</span>
                      <span className="text-white">{session.platform}</span>
                    </div>
                  </div>
                </div>

                {/* Session Metadata */}
                <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4 space-y-3">
                  <h4 className="text-sm font-medium text-slate-300">
                    Session Details
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400 shrink-0">Session ID</span>
                      <span className="text-white font-mono text-xs truncate">
                        {session.id.substring(0, 8)}...
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400 shrink-0">Ref ID</span>
                      <span className="text-white font-mono text-xs truncate">
                        {session.ref_id}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400 shrink-0">Created</span>
                      <span className="text-white text-xs">
                        {formatDateTime(session.created_at)}
                      </span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400 shrink-0">Updated</span>
                      <span className="text-white text-xs">
                        {formatDateTime(session.updated_at)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-slate-400 flex items-center gap-1 shrink-0">
                        <DollarSign className="h-3 w-3" />
                        Billed
                      </span>
                      {session.billed ? (
                        <Badge className="border-green-500/30 bg-green-500/10 text-green-400">
                          Yes
                        </Badge>
                      ) : (
                        <Badge className="border-slate-500/30 bg-slate-500/10 text-slate-400">
                          No
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Redirect URL */}
              <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4 space-y-2">
                <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Post-KYC Redirect
                </h4>
                <div className="text-sm">
                  {session.redirect_url ? (
                    <div className="space-y-1">
                      <p className="text-xs text-slate-500">Client-specified redirect URL:</p>
                      <a
                        href={session.redirect_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-400 hover:text-indigo-300 font-mono text-xs break-all"
                      >
                        {session.redirect_url}
                      </a>
                    </div>
                  ) : (
                    <p className="text-slate-500 text-xs">
                      Using TrueStack default status page (no custom redirect URL provided)
                    </p>
                  )}
                </div>
              </div>

              {/* OCR Document Data */}
              {session.document && (
                <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
                  <h4 className="text-sm font-medium text-green-300 mb-3 flex items-center gap-2">
                    <FileCheck className="h-4 w-4" />
                    OCR Document Data
                  </h4>
                  <div className="grid gap-3 md:grid-cols-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Full Name</span>
                      <span className="text-white">
                        {session.document.full_name || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">ID Number</span>
                      <span className="text-white font-mono">
                        {session.document.id_number || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Gender</span>
                      <span className="text-white">
                        {session.document.gender || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">DOB</span>
                      <span className="text-white">
                        {session.document.dob || "-"}
                      </span>
                    </div>
                    <div className="flex justify-between col-span-2">
                      <span className="text-slate-400">Address</span>
                      <span className="text-white text-xs text-right max-w-[350px]">
                        {session.document.address || "-"}
                      </span>
                    </div>
                    {session.document.nationality && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Nationality</span>
                        <span className="text-white">
                          {session.document.nationality}
                        </span>
                      </div>
                    )}
                    {session.document.religion && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Religion</span>
                        <span className="text-white">
                          {session.document.religion}
                        </span>
                      </div>
                    )}
                    {session.document.race && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Race</span>
                        <span className="text-white">{session.document.race}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Verification Tab */}
            <TabsContent value="verification" className="mt-4 space-y-4">
              {session.verification ? (
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
                  <h4 className="text-sm font-medium text-blue-300 mb-4 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Verification Results
                  </h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <VerificationCheck
                      label="Document Valid"
                      value={session.verification.document_valid}
                    />
                    <VerificationCheck
                      label="Name Match"
                      value={session.verification.name_match}
                    />
                    <VerificationCheck
                      label="ID Match"
                      value={session.verification.id_match}
                    />
                    <VerificationCheck
                      label="Front/Back Match"
                      value={session.verification.front_back_match}
                    />
                    <VerificationCheck
                      label="Landmark Valid"
                      value={session.verification.landmark_valid}
                    />
                    <VerificationCheck
                      label="Face Match"
                      value={session.verification.face_match}
                    />
                    <VerificationCheck
                      label="Liveness Passed"
                      value={session.verification.liveness_passed}
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 text-sm">
                        Face Match Score
                      </span>
                      <span className="text-white font-mono">
                        {session.verification.face_match_score !== null &&
                        session.verification.face_match_score !== undefined
                          ? `${session.verification.face_match_score}%`
                          : "-"}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <FileCheck className="h-12 w-12 text-slate-600 mb-4" />
                  <p className="text-slate-400">No verification data available</p>
                  <p className="text-sm text-slate-500">
                    Verification results will appear after the KYC process is completed.
                  </p>
                </div>
              )}

              {/* Raw Response */}
              {session._raw && (
                <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
                  <h4 className="text-sm font-medium text-slate-300 mb-3">
                    Raw Innovatif Response
                  </h4>
                  <pre className="text-xs text-slate-400 overflow-auto max-h-64 p-3 rounded bg-slate-900">
                    {JSON.stringify(session._raw, (key, value) => {
                      // Truncate base64 image strings
                      if (typeof value === "string" && value.length > 200) {
                        if (value.startsWith("data:image") || value.match(/^[A-Za-z0-9+/=]{100,}$/)) {
                          return `[BASE64 IMAGE - ${value.length} chars]`;
                        }
                      }
                      return value;
                    }, 2)}
                  </pre>
                </div>
              )}
            </TabsContent>

            {/* Images Tab */}
            <TabsContent value="images" className="mt-4 space-y-4">
              {session.images && Object.values(session.images).some(Boolean) ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {session.images.front_document && (
                    <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
                      <h4 className="text-sm font-medium text-slate-300 mb-3">
                        Front Document
                      </h4>
                      <img
                        src={session.images.front_document}
                        alt="Front Document"
                        className="rounded-lg w-full object-contain max-h-48"
                      />
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-2 text-blue-400"
                        onClick={() =>
                          window.open(session.images!.front_document, "_blank")
                        }
                      >
                        <ExternalLink className="mr-1 h-3 w-3" />
                        Open Full Size
                      </Button>
                    </div>
                  )}
                  {session.images.back_document && (
                    <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
                      <h4 className="text-sm font-medium text-slate-300 mb-3">
                        Back Document
                      </h4>
                      <img
                        src={session.images.back_document}
                        alt="Back Document"
                        className="rounded-lg w-full object-contain max-h-48"
                      />
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-2 text-blue-400"
                        onClick={() =>
                          window.open(session.images!.back_document, "_blank")
                        }
                      >
                        <ExternalLink className="mr-1 h-3 w-3" />
                        Open Full Size
                      </Button>
                    </div>
                  )}
                  {session.images.face_image && (
                    <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
                      <h4 className="text-sm font-medium text-slate-300 mb-3">
                        Face Image
                      </h4>
                      <img
                        src={session.images.face_image}
                        alt="Face Image"
                        className="rounded-lg w-full object-contain max-h-48"
                      />
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-2 text-blue-400"
                        onClick={() =>
                          window.open(session.images!.face_image, "_blank")
                        }
                      >
                        <ExternalLink className="mr-1 h-3 w-3" />
                        Open Full Size
                      </Button>
                    </div>
                  )}
                  {session.images.best_frame && (
                    <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
                      <h4 className="text-sm font-medium text-slate-300 mb-3">
                        Selfie (Liveness)
                      </h4>
                      <img
                        src={session.images.best_frame}
                        alt="Selfie"
                        className="rounded-lg w-full object-contain max-h-48"
                      />
                      <Button
                        variant="link"
                        size="sm"
                        className="mt-2 text-blue-400"
                        onClick={() =>
                          window.open(session.images!.best_frame, "_blank")
                        }
                      >
                        <ExternalLink className="mr-1 h-3 w-3" />
                        Open Full Size
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Eye className="h-12 w-12 text-slate-600 mb-4" />
                  <p className="text-slate-400">No images available</p>
                  <p className="text-sm text-slate-500">
                    Images will appear after the KYC process is completed.
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Webhook Tab */}
            <TabsContent value="webhook" className="mt-4 space-y-4">
              <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4 space-y-3">
                <h4 className="text-sm font-medium text-slate-300">
                  Webhook Delivery Status
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Delivered</span>
                    {session.webhook_delivered ? (
                      <Badge className="border-green-500/30 bg-green-500/10 text-green-400">
                        Yes
                      </Badge>
                    ) : (
                      <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400">
                        Pending
                      </Badge>
                    )}
                  </div>
                  {session.webhook_delivered_at && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">Delivered At</span>
                      <span className="text-white">
                        {formatDateTime(session.webhook_delivered_at)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-400">Sent</span>
                    <span className="text-white">{session.webhook_attempts}</span>
                  </div>
                  {session.webhook_url && (
                    <div className="flex justify-between">
                      <span className="text-slate-400">URL</span>
                      <span className="text-white text-xs font-mono truncate max-w-[300px]">
                        {session.webhook_url}
                      </span>
                    </div>
                  )}
                  {session.webhook_last_error && (
                    <div className="mt-2 p-2 rounded bg-red-500/10 border border-red-500/20">
                      <span className="text-red-400 text-xs">
                        {session.webhook_last_error}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-slate-600 mb-4" />
            <p className="text-slate-400">Failed to load session details</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
