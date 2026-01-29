"use client";

import React, { useEffect, useState, useCallback } from "react";
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
import { Key, CreditCard, FileCheck, Copy, Eye, EyeOff, Ban, DollarSign, Plus, Trash2, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, ChevronLeft, ChevronRight, ChevronDown, ChevronUp, FileText, Download, Receipt } from "lucide-react";
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
import { AdvancePaymentModal } from "./advance-payment-modal";
import { KycSessionDetailModal } from "./kyc-session-detail-modal";
import { GenerateInvoiceModal } from "./generate-invoice-modal";
import { RecordPaymentModal } from "./record-payment-modal";
import { apiClient, formatDate, formatDateTime, TIMEZONE } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

type PricingTier = {
  id?: string;
  tier_name: string;
  min_volume: number;
  max_volume: number | null;
  credits_per_session: number; // 10 credits = RM 1
};

type KycSession = {
  id: string;
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

type KycSessionsPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type Invoice = {
  id: string;
  invoice_number: string;
  period_start: string;
  period_end: string;
  due_date: string;
  total_usage_credits: number;
  previous_balance_credits: number;
  amount_due_credits: number;
  amount_due_myr: string;
  sst_rate: string;
  sst_amount_myr: string;
  total_with_sst_myr: string;
  amount_paid_credits: number;
  amount_paid_myr: string;
  status: string;
  generated_at: string;
  generated_by_name: string | null;
};

type Payment = {
  id: string;
  receipt_number: string;
  amount_credits: number;
  amount_myr: string;
  sst_rate: string;
  sst_amount_myr: string;
  total_with_sst_myr: string;
  payment_date: string;
  payment_method: string | null;
  payment_reference: string | null;
  recorded_by_name: string | null;
  receiptUrl: string | null;
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
  
  // Pricing state
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);
  const [loadingPricing, setLoadingPricing] = useState(true);
  const [savingPricing, setSavingPricing] = useState(false);
  const [currentMonthUsage, setCurrentMonthUsage] = useState(0);
  const [allowOverdraft, setAllowOverdraft] = useState(false);
  const [savingOverdraft, setSavingOverdraft] = useState(false);

  // KYC Sessions state
  const [kycSessions, setKycSessions] = useState<KycSession[]>([]);
  const [kycSessionsPagination, setKycSessionsPagination] = useState<KycSessionsPagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [loadingKycSessions, setLoadingKycSessions] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [sessionModalOpen, setSessionModalOpen] = useState(false);

  // Invoice state
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(true);
  const [generateInvoiceModalOpen, setGenerateInvoiceModalOpen] = useState(false);
  const [recordPaymentModalOpen, setRecordPaymentModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [expandedInvoiceId, setExpandedInvoiceId] = useState<string | null>(null);
  const [invoicePayments, setInvoicePayments] = useState<Record<string, Payment[]>>({});
  const [loadingPayments, setLoadingPayments] = useState<string | null>(null);

  // Fetch KYC sessions
  const fetchKycSessions = useCallback(async (page = 1) => {
    setLoadingKycSessions(true);
    try {
      const data = await apiClient<{
        sessions: KycSession[];
        pagination: KycSessionsPagination;
      }>(`/api/admin/clients/${client.id}/kyc-sessions?page=${page}&limit=10`);
      setKycSessions(data.sessions);
      setKycSessionsPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching KYC sessions:", error);
      toast.error("Failed to load KYC sessions");
    } finally {
      setLoadingKycSessions(false);
    }
  }, [client.id]);

  const openSessionDetail = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setSessionModalOpen(true);
  };

  // Fetch invoices
  const fetchInvoices = useCallback(async () => {
    setLoadingInvoices(true);
    try {
      const data = await apiClient<{ invoices: Invoice[] }>(
        `/api/admin/clients/${client.id}/invoices`
      );
      setInvoices(data.invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast.error("Failed to load invoices");
    } finally {
      setLoadingInvoices(false);
    }
  }, [client.id]);

  // Fetch payments for an invoice
  const fetchPayments = useCallback(async (invoiceId: string) => {
    setLoadingPayments(invoiceId);
    try {
      const data = await apiClient<{ payments: Payment[] }>(
        `/api/admin/clients/${client.id}/invoices/${invoiceId}/payments`
      );
      setInvoicePayments(prev => ({ ...prev, [invoiceId]: data.payments }));
    } catch (error) {
      console.error("Error fetching payments:", error);
      toast.error("Failed to load payments");
    } finally {
      setLoadingPayments(null);
    }
  }, [client.id]);

  const toggleInvoicePayments = (invoiceId: string) => {
    if (expandedInvoiceId === invoiceId) {
      setExpandedInvoiceId(null);
    } else {
      setExpandedInvoiceId(invoiceId);
      if (!invoicePayments[invoiceId]) {
        fetchPayments(invoiceId);
      }
    }
  };

  const downloadReceiptPdf = (receiptUrl: string | null) => {
    if (receiptUrl) {
      window.open(receiptUrl, "_blank");
    } else {
      toast.error("Receipt not available");
    }
  };

  const openRecordPayment = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId);
    setRecordPaymentModalOpen(true);
  };

  const getInvoiceStatusBadge = (invoice: Invoice) => {
    const dueDate = new Date(invoice.due_date);
    const today = new Date();
    const isOverdue = invoice.status !== "paid" && invoice.status !== "void" && invoice.status !== "superseded" && dueDate < today;

    if (invoice.status === "paid") {
      return <Badge className="border-green-500/30 bg-green-500/10 text-green-400">Paid</Badge>;
    }
    if (invoice.status === "void") {
      return <Badge className="border-slate-500/30 bg-slate-500/10 text-slate-400">Void</Badge>;
    }
    if (invoice.status === "superseded") {
      return <Badge className="border-slate-500/30 bg-slate-500/10 text-slate-400">Superseded</Badge>;
    }
    if (invoice.status === "partial") {
      return (
        <Badge className={isOverdue ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-amber-500/30 bg-amber-500/10 text-amber-400"}>
          Partial {isOverdue && "(Overdue)"}
        </Badge>
      );
    }
    // Generated
    return (
      <Badge className={isOverdue ? "border-red-500/30 bg-red-500/10 text-red-400" : "border-blue-500/30 bg-blue-500/10 text-blue-400"}>
        {isOverdue ? "Overdue" : "Pending"}
      </Badge>
    );
  };

  const downloadInvoicePdf = async (invoiceId: string) => {
    try {
      const data = await apiClient<{ pdfUrl: string }>(
        `/api/admin/clients/${client.id}/invoices/${invoiceId}`
      );
      if (data.pdfUrl) {
        window.open(data.pdfUrl, "_blank");
      } else {
        toast.error("PDF not available");
      }
    } catch (error) {
      toast.error("Failed to download invoice");
    }
  };

  const voidInvoice = async (invoiceId: string, invoiceNumber: string) => {
    const confirmed = window.confirm(
      `Are you sure you want to void invoice ${invoiceNumber}?\n\nThis will mark the invoice as void and it will no longer be considered in billing calculations.\n\nAny invoices that were superseded by this invoice will be restored.`
    );
    if (!confirmed) return;

    try {
      const result = await apiClient<{ success: boolean; restoredInvoices?: string[] }>(
        `/api/admin/clients/${client.id}/invoices/${invoiceId}`,
        { method: "PATCH", body: JSON.stringify({ status: "void" }) }
      );
      
      if (result.restoredInvoices && result.restoredInvoices.length > 0) {
        toast.success(`Invoice ${invoiceNumber} voided. Restored: ${result.restoredInvoices.join(", ")}`);
      } else {
        toast.success(`Invoice ${invoiceNumber} has been voided`);
      }
      // Refresh invoices list
      fetchInvoices();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to void invoice");
    }
  };

  const getStatusIcon = (status: string, result: string | null) => {
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

  // Credit system: 10 credits = RM 1
  const CREDITS_PER_MYR = 10;

  const addPricingTier = () => {
    const lastTier = pricingTiers[pricingTiers.length - 1];
    // Session numbers are 1-indexed: if last tier is 1-3, new tier starts at 4
    const newMinVolume = lastTier ? (lastTier.max_volume || lastTier.min_volume) + 1 : 1;
    setPricingTiers([
      ...pricingTiers,
      {
        tier_name: `Tier ${pricingTiers.length + 1}`,
        min_volume: newMinVolume,
        max_volume: null,
        credits_per_session: 50, // Default: 50 credits = RM 5
      },
    ]);
  };

  const removePricingTier = (index: number) => {
    setPricingTiers(pricingTiers.filter((_, i) => i !== index));
  };

  const updatePricingTier = (index: number, field: keyof PricingTier, value: string | number | null) => {
    const updated = [...pricingTiers];
    updated[index] = { ...updated[index], [field]: value };
    setPricingTiers(updated);
  };

  const savePricingTiers = async () => {
    setSavingPricing(true);
    try {
      const tiersToSave = pricingTiers.map((tier) => ({
        tierName: tier.tier_name,
        minVolume: tier.min_volume,
        maxVolume: tier.max_volume,
        creditsPerSession: tier.credits_per_session,
      }));

      await apiClient(`/api/admin/clients/${client.id}/pricing`, {
        method: "POST",
        body: JSON.stringify({ tiers: tiersToSave }),
      });

      toast.success("Pricing tiers saved successfully");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save pricing tiers");
    } finally {
      setSavingPricing(false);
    }
  };

  const toggleAllowOverdraft = async (newValue: boolean) => {
    setSavingOverdraft(true);
    try {
      await apiClient(`/api/admin/clients/${client.id}/config`, {
        method: "PATCH",
        body: JSON.stringify({ allow_overdraft: newValue }),
      });
      setAllowOverdraft(newValue);
      toast.success(`Allow overdraft ${newValue ? "enabled" : "disabled"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update setting");
    } finally {
      setSavingOverdraft(false);
    }
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

    // Fetch pricing tiers and config
    apiClient<{ tiers: PricingTier[]; currentMonthUsage: number; allowOverdraft: boolean }>(
      `/api/admin/clients/${client.id}/pricing`
    )
      .then((data) => {
        setPricingTiers(data.tiers);
        setCurrentMonthUsage(data.currentMonthUsage);
        setAllowOverdraft(data.allowOverdraft ?? false);
      })
      .catch(console.error)
      .finally(() => setLoadingPricing(false));

    // Fetch KYC sessions
    fetchKycSessions();

    // Fetch invoices
    fetchInvoices();
  }, [client.id, fetchKycSessions, fetchInvoices]);

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
        <TabsTrigger
          value="pricing"
          className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400"
        >
          <DollarSign className="mr-2 h-4 w-4" />
          Pricing
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
                <div>
                  <span className="text-slate-400">Credit Balance</span>
                  <p className="text-xs text-slate-500">10 credits = RM 1</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-semibold text-white">
                    {creditBalance.toLocaleString()}
                  </span>
                  <p className="text-sm text-slate-400">
                    (RM {(creditBalance / 10).toFixed(2)})
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Total Sessions</span>
                <span className="text-2xl font-semibold text-white">
                  {Number(client.sessionsCount || 0).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-700 pt-4">
                <div>
                  <span className="text-slate-400">Billed Sessions</span>
                  <p className="text-xs text-slate-500">
                    {new Date().toLocaleString("en-MY", { month: "long", year: "numeric", timeZone: TIMEZONE })}
                  </p>
                </div>
                <span className="text-2xl font-semibold text-green-400">
                  {loadingPricing ? "..." : currentMonthUsage.toLocaleString()}
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
                        {formatDate(apiKey.created_at)}
                      </TableCell>
                      <TableCell className="text-slate-400">
                        {apiKey.revoked_at
                          ? formatDateTime(apiKey.revoked_at)
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
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white">KYC Sessions</CardTitle>
                <CardDescription className="text-slate-400">
                  View all KYC verification sessions for this client.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchKycSessions(kycSessionsPagination.page)}
                disabled={loadingKycSessions}
                className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loadingKycSessions ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {loadingKycSessions ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 text-slate-600 animate-spin" />
                </div>
              ) : kycSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <FileCheck className="h-12 w-12 text-slate-600 mb-4" />
                  <p className="text-slate-400">No KYC sessions yet</p>
                  <p className="text-sm text-slate-500">
                    Sessions will appear here once the client starts using the API.
                  </p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-800 hover:bg-transparent">
                        <TableHead className="text-slate-400">Status</TableHead>
                        <TableHead className="text-slate-400">Ref ID</TableHead>
                        <TableHead className="text-slate-400">Document</TableHead>
                        <TableHead className="text-slate-400">Billed</TableHead>
                        <TableHead className="text-slate-400">Created</TableHead>
                        <TableHead className="text-right text-slate-400">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {kycSessions.map((session) => (
                        <TableRow
                          key={session.id}
                          className="border-slate-800 cursor-pointer hover:bg-slate-800/50"
                          onClick={() => openSessionDetail(session.id)}
                        >
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(session.status, session.result)}
                              {getStatusBadge(session.status, session.result)}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-slate-300">
                            {session.ref_id}
                          </TableCell>
                          <TableCell className="text-slate-300">
                            <div>
                              <p className="text-sm">{session.document_name}</p>
                              <p className="text-xs text-slate-500 font-mono">
                                {session.document_number}
                              </p>
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
                          <TableCell className="text-slate-400 text-sm">
                            {formatDateTime(session.created_at)}
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

                  {/* Pagination */}
                  {kycSessionsPagination.totalPages > 1 && (
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-800">
                      <p className="text-sm text-slate-400">
                        Showing {(kycSessionsPagination.page - 1) * kycSessionsPagination.limit + 1} to{" "}
                        {Math.min(
                          kycSessionsPagination.page * kycSessionsPagination.limit,
                          kycSessionsPagination.total
                        )}{" "}
                        of {kycSessionsPagination.total} sessions
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchKycSessions(kycSessionsPagination.page - 1)}
                          disabled={kycSessionsPagination.page <= 1 || loadingKycSessions}
                          className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="flex items-center px-3 text-sm text-slate-400">
                          Page {kycSessionsPagination.page} of {kycSessionsPagination.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => fetchKycSessions(kycSessionsPagination.page + 1)}
                          disabled={
                            kycSessionsPagination.page >= kycSessionsPagination.totalPages ||
                            loadingKycSessions
                          }
                          className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Session Detail Modal */}
        <KycSessionDetailModal
          sessionId={selectedSessionId}
          clientId={client.id}
          open={sessionModalOpen}
          onOpenChange={setSessionModalOpen}
        />
      </TabsContent>

      <TabsContent value="billing">
        <div className="space-y-6">
          {/* Invoices Section */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white">Invoices</CardTitle>
                <CardDescription className="text-slate-400">
                  View and manage invoices for this client.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={fetchInvoices}
                  disabled={loadingInvoices}
                  className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loadingInvoices ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <Button
                  size="sm"
                  onClick={() => setGenerateInvoiceModalOpen(true)}
                  className="bg-linear-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Invoice
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingInvoices ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-8 w-8 text-slate-600 animate-spin" />
                </div>
              ) : invoices.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <FileText className="h-12 w-12 text-slate-600 mb-4" />
                  <p className="text-slate-400">No invoices yet</p>
                  <p className="text-sm text-slate-500">
                    Generate an invoice to bill this client for usage.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400">Invoice #</TableHead>
                      <TableHead className="text-slate-400">Period</TableHead>
                      <TableHead className="text-slate-400">Due Date</TableHead>
                      <TableHead className="text-slate-400">Status</TableHead>
                      <TableHead className="text-right text-slate-400">Amount Due</TableHead>
                      <TableHead className="text-right text-slate-400">Paid</TableHead>
                      <TableHead className="text-right text-slate-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <React.Fragment key={invoice.id}>
                      <TableRow className="border-slate-800">
                        <TableCell className="font-mono text-sm text-slate-300">
                          {invoice.invoice_number}
                        </TableCell>
                        <TableCell className="text-sm text-slate-400">
                          {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                        </TableCell>
                        <TableCell className="text-sm text-slate-400">
                          {formatDate(invoice.due_date)}
                        </TableCell>
                        <TableCell>
                          {getInvoiceStatusBadge(invoice)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <span className="text-slate-300">RM {parseFloat(invoice.total_with_sst_myr).toFixed(2)}</span>
                            <p className="text-xs text-slate-500">
                              {invoice.amount_due_credits.toLocaleString()} cr + {Math.round(parseFloat(invoice.sst_rate) * 100)}% SST
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <span className="text-green-400">RM {parseFloat(invoice.amount_paid_myr).toFixed(2)}</span>
                            <p className="text-xs text-slate-500">{invoice.amount_paid_credits.toLocaleString()} cr</p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => downloadInvoicePdf(invoice.id)}
                              className="h-8 w-8 text-slate-400 hover:text-white"
                              title="Download Invoice PDF"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                            {(invoice.status === "paid" || invoice.status === "partial" || invoice.amount_paid_credits > 0) && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => toggleInvoicePayments(invoice.id)}
                                className="h-8 w-8 text-slate-400 hover:text-white"
                                title="View Receipts"
                              >
                                {expandedInvoiceId === invoice.id ? (
                                  <ChevronUp className="h-4 w-4" />
                                ) : (
                                  <Receipt className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            {(invoice.status === "generated" || invoice.status === "partial") && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openRecordPayment(invoice.id)}
                                className="text-green-400 hover:bg-green-500/10 hover:text-green-300"
                              >
                                <DollarSign className="mr-1 h-4 w-4" />
                                Pay
                              </Button>
                            )}
                            {(invoice.status === "generated" || invoice.status === "pending") && invoice.amount_paid_credits === 0 && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => voidInvoice(invoice.id, invoice.invoice_number)}
                                className="h-8 w-8 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                title="Void Invoice"
                              >
                                <Ban className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                      {/* Expandable payments row */}
                      {expandedInvoiceId === invoice.id && (
                        <TableRow className="border-slate-800 bg-slate-800/30">
                          <TableCell colSpan={7} className="p-4">
                            <div className="space-y-3">
                              <h4 className="text-sm font-medium text-slate-300 flex items-center gap-2">
                                <Receipt className="h-4 w-4" />
                                Payment History
                              </h4>
                              {loadingPayments === invoice.id ? (
                                <div className="flex items-center gap-2 text-slate-400 text-sm">
                                  <RefreshCw className="h-4 w-4 animate-spin" />
                                  Loading payments...
                                </div>
                              ) : invoicePayments[invoice.id]?.length === 0 ? (
                                <p className="text-sm text-slate-500">No payments recorded</p>
                              ) : (
                                <div className="space-y-2">
                                  {invoicePayments[invoice.id]?.map((payment) => (
                                    <div
                                      key={payment.id}
                                      className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800/50 p-3"
                                    >
                                      <div className="flex items-center gap-4">
                                        <div>
                                          <p className="text-sm font-medium text-slate-300">
                                            {payment.receipt_number}
                                          </p>
                                          <p className="text-xs text-slate-500">
                                            {formatDate(payment.payment_date)}
                                            {payment.payment_method && ` • ${payment.payment_method.replace("_", " ")}`}
                                            {payment.payment_reference && ` • Ref: ${payment.payment_reference}`}
                                          </p>
                                        </div>
                                      </div>
                                        <div className="flex items-center gap-4">
                                        <div className="text-right">
                                          <p className="text-sm font-medium text-green-400">
                                            RM {parseFloat(payment.total_with_sst_myr).toFixed(2)}
                                          </p>
                                          <p className="text-xs text-slate-500">
                                            {payment.amount_credits.toLocaleString()} cr + {Math.round(parseFloat(payment.sst_rate) * 100)}% SST
                                          </p>
                                        </div>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => downloadReceiptPdf(payment.receiptUrl)}
                                          className="h-8 w-8 text-slate-400 hover:text-white"
                                          title="Download Receipt"
                                        >
                                          <Download className="h-4 w-4" />
                                        </Button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Credit Ledger Section */}
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white">Credit Ledger</CardTitle>
                <CardDescription className="text-slate-400">
                  View credit transactions and top-up history.
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setLoadingCredits(true);
                    apiClient<{ balance: number; entries: CreditEntry[] }>(
                      `/api/admin/clients/${client.id}/credits`
                    )
                      .then((data) => {
                        setCreditBalance(data.balance);
                        setCreditEntries(data.entries);
                        toast.success("Credit ledger refreshed");
                      })
                      .catch(console.error)
                      .finally(() => setLoadingCredits(false));
                  }}
                  disabled={loadingCredits}
                  className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${loadingCredits ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <AdvancePaymentModal
                  clientId={client.id}
                  clientName={client.name}
                  currentBalance={creditBalance}
                  onPaymentRecorded={() => {
                    // Refresh credit ledger
                    apiClient<{ balance: number; entries: CreditEntry[] }>(
                      `/api/admin/clients/${client.id}/credits`
                    )
                      .then((data) => {
                        setCreditBalance(data.balance);
                        setCreditEntries(data.entries);
                      })
                      .catch(console.error);
                  }}
                />
                <TopupCreditsModal
                  clientId={client.id}
                  clientName={client.name}
                  currentBalance={creditBalance}
                />
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6 rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm text-slate-400">Current Balance</span>
                    <p className="text-xs text-slate-500 mt-1">10 credits = RM 1</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-semibold text-white">
                      {creditBalance.toLocaleString()} credits
                    </span>
                    <p className="text-sm text-slate-400">
                      (RM {(creditBalance / 10).toFixed(2)})
                    </p>
                  </div>
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
                      <TableHead className="text-right text-slate-400">Amount (Credits)</TableHead>
                      <TableHead className="text-right text-slate-400">Balance (Credits)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {creditEntries.map((entry) => (
                      <TableRow key={entry.id} className="border-slate-800">
                        <TableCell className="text-slate-400">
                          {formatDateTime(entry.created_at)}
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
                                : entry.type === "payment"
                                ? "border-green-500/30 bg-green-500/10 text-green-400"
                                : "border-slate-500/30 bg-slate-500/10 text-slate-400"
                            }
                          >
                            {entry.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {entry.description || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <span className={`font-medium ${entry.amount >= 0 ? "text-green-400" : "text-red-400"}`}>
                              {entry.amount >= 0 ? "+" : ""}
                              {entry.amount.toLocaleString()}
                            </span>
                            <p className="text-xs text-slate-500">
                              (RM {Math.abs(entry.amount / 10).toFixed(2)})
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <span className="text-slate-300">{entry.balance_after.toLocaleString()}</span>
                            <p className="text-xs text-slate-500">
                              (RM {(entry.balance_after / 10).toFixed(2)})
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Generate Invoice Modal */}
        <GenerateInvoiceModal
          clientId={client.id}
          clientName={client.name}
          open={generateInvoiceModalOpen}
          onOpenChange={setGenerateInvoiceModalOpen}
          onInvoiceGenerated={fetchInvoices}
        />

        {/* Record Payment Modal */}
        <RecordPaymentModal
          clientId={client.id}
          invoiceId={selectedInvoiceId}
          open={recordPaymentModalOpen}
          onOpenChange={setRecordPaymentModalOpen}
          onPaymentRecorded={() => {
            fetchInvoices();
            // Also refresh credit ledger
            apiClient<{ balance: number; entries: CreditEntry[] }>(
              `/api/admin/clients/${client.id}/credits`
            )
              .then((data) => {
                setCreditBalance(data.balance);
                setCreditEntries(data.entries);
              })
              .catch(console.error);
          }}
        />
      </TabsContent>

      <TabsContent value="pricing">
        {/* Billing Configuration */}
        <Card className="border-slate-800 bg-slate-900/50 mb-6">
          <CardHeader>
            <CardTitle className="text-white">Billing Configuration</CardTitle>
            <CardDescription className="text-slate-400">
              Configure billing settings for this client.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <div className="flex items-start gap-4">
                <input
                  type="checkbox"
                  id="allowOverdraft"
                  checked={allowOverdraft}
                  onChange={(e) => toggleAllowOverdraft(e.target.checked)}
                  disabled={savingOverdraft || loadingPricing}
                  className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <Label htmlFor="allowOverdraft" className="text-white cursor-pointer">
                    Allow Overdraft (Negative Balance)
                  </Label>
                  <p className="mt-1 text-sm text-slate-400">
                    When enabled, the client can continue creating KYC sessions even with zero or negative credit balance. 
                    The balance will go negative and will be reconciled at the end of the billing cycle.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Tiers */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-white">Pricing Tiers</CardTitle>
              <CardDescription className="text-slate-400">
                Configure volume-based pricing for TrueIdentity KYC sessions.
                Session numbers are 1-indexed. Tiers reset on the 1st of each month at midnight MYT.
                Current month usage: {currentMonthUsage} sessions.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={addPricingTier}
                className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Tier
              </Button>
              <Button
                size="sm"
                onClick={savePricingTiers}
                disabled={savingPricing || pricingTiers.length === 0}
                className="bg-linear-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600"
              >
                {savingPricing ? "Saving..." : "Save Pricing"}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loadingPricing ? (
              <p className="text-sm text-slate-400">Loading pricing tiers...</p>
            ) : pricingTiers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center">
                <DollarSign className="mx-auto mb-4 h-12 w-12 text-slate-600" />
                <p className="text-sm text-slate-400 mb-4">
                  No pricing tiers configured. Add tiers to set volume-based pricing.
                </p>
                <Button
                  variant="outline"
                  onClick={addPricingTier}
                  className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add First Tier
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                  <p className="text-xs text-slate-500 mb-2">
                    Pricing is applied based on monthly volume. Set min/max volume ranges and price per KYC session.
                  </p>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400">Tier Name</TableHead>
                      <TableHead className="text-slate-400">From Session</TableHead>
                      <TableHead className="text-slate-400">To Session</TableHead>
                      <TableHead className="text-slate-400">Credits per KYC</TableHead>
                      <TableHead className="text-slate-400">MYR Equivalent</TableHead>
                      <TableHead className="text-right text-slate-400">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pricingTiers.map((tier, index) => (
                      <TableRow key={tier.id || index} className="border-slate-800">
                        <TableCell>
                          <Input
                            value={tier.tier_name}
                            onChange={(e) => updatePricingTier(index, "tier_name", e.target.value)}
                            className="h-8 w-32 border-slate-700 bg-slate-800 text-white"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            value={tier.min_volume}
                            onChange={(e) => updatePricingTier(index, "min_volume", parseInt(e.target.value) || 0)}
                            className="h-8 w-24 border-slate-700 bg-slate-800 text-white"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={tier.min_volume}
                            value={tier.max_volume ?? ""}
                            placeholder="Unlimited"
                            onChange={(e) => updatePricingTier(index, "max_volume", e.target.value ? parseInt(e.target.value) : null)}
                            className="h-8 w-24 border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={1}
                            value={tier.credits_per_session}
                            onChange={(e) => updatePricingTier(index, "credits_per_session", parseInt(e.target.value) || 1)}
                            className="h-8 w-24 border-slate-700 bg-slate-800 text-white"
                          />
                        </TableCell>
                        <TableCell className="text-slate-400 text-sm">
                          RM {(tier.credits_per_session / CREDITS_PER_MYR).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removePricingTier(index)}
                            className="h-8 w-8 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
                  <h4 className="text-sm font-medium text-white mb-2">Credit System</h4>
                  <p className="text-xs text-slate-400 mb-2">
                    <strong>10 credits = RM 1</strong> (each credit = RM 0.10)
                  </p>
                  <h4 className="text-sm font-medium text-white mb-2">Example Pricing Calculation</h4>
                  <p className="text-xs text-slate-400">
                    If a client uses 150 KYC sessions in a month with tiers: 0-100 @ 50 credits, 101-500 @ 45 credits
                    <br />
                    Total: (100 × 50) + (50 × 45) = 5,000 + 2,250 = 7,250 credits (RM 725)
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
