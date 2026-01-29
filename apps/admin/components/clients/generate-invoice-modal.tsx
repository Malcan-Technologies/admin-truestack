"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { apiClient, formatDate } from "@/lib/utils";
import { FileText, RefreshCw, AlertCircle } from "lucide-react";

type UsageByTier = {
  productId: string;
  tierName: string | null;
  sessionCount: number;
  creditsPerSession: number;
  totalCredits: number;
};

type UnpaidInvoice = {
  id: string;
  invoiceNumber: string;
  unpaidCredits: number;
};

type InvoicePreview = {
  client: {
    name: string;
    code: string;
  };
  periodStart: string;
  periodEnd: string;
  usage: UsageByTier[];
  totalUsageCredits: number;
  unpaidInvoices: UnpaidInvoice[];
  previousBalanceCredits: number;
  currentBalance: number;
  amountDueCredits: number;
  amountDueMyr: number;
};

interface GenerateInvoiceModalProps {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvoiceGenerated: () => void;
}

export function GenerateInvoiceModal({
  clientId,
  clientName,
  open,
  onOpenChange,
  onInvoiceGenerated,
}: GenerateInvoiceModalProps) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [preview, setPreview] = useState<InvoicePreview | null>(null);
  const [canGenerate, setCanGenerate] = useState(false);
  const [reason, setReason] = useState<string | null>(null);

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiClient<{
        canGenerate: boolean;
        reason?: string;
        preview?: InvoicePreview;
      }>(`/api/admin/clients/${clientId}/invoices/preview`);

      setCanGenerate(data.canGenerate);
      if (data.canGenerate && data.preview) {
        setPreview(data.preview);
        setReason(null);
      } else {
        setPreview(null);
        setReason(data.reason || "Cannot generate invoice");
      }
    } catch (error) {
      toast.error("Failed to load invoice preview");
      setCanGenerate(false);
      setReason("Failed to load preview");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    if (open) {
      fetchPreview();
    }
  }, [open, fetchPreview]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await apiClient(`/api/admin/clients/${clientId}/invoices`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      toast.success("Invoice generated successfully");
      onInvoiceGenerated();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate invoice");
    } finally {
      setGenerating(false);
    }
  };

  const handleCleanup = async () => {
    try {
      const result = await apiClient<{ deleted: number; invoices: string[] }>(
        `/api/admin/clients/${clientId}/invoices/cleanup`,
        { method: "DELETE" }
      );
      if (result.deleted > 0) {
        toast.success(`Cleaned up ${result.deleted} stuck invoice(s)`);
        // Refresh preview after cleanup
        fetchPreview();
      } else {
        toast.info("No stuck invoices to clean up");
      }
    } catch (error) {
      toast.error("Failed to clean up invoices");
    }
  };

  const getProductName = (productId: string) => {
    const names: Record<string, string> = {
      true_identity: "TrueIdentity",
    };
    return names[productId] || productId;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-800 bg-slate-900 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Invoice
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Generate a new invoice for {clientName}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-slate-600 animate-spin" />
          </div>
        ) : !canGenerate ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-400 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-400">Cannot Generate Invoice</h3>
                  <p className="mt-1 text-sm text-amber-300/80">{reason}</p>
                </div>
              </div>
            </div>
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <p className="text-sm text-slate-400 mb-3">
                If a previous invoice generation failed, there may be a stuck pending invoice blocking new generation.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCleanup}
                className="border-slate-600 bg-transparent text-slate-300 hover:bg-slate-700 hover:text-white"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Clean Up Stuck Invoices
              </Button>
            </div>
          </div>
        ) : preview ? (
          <div className="space-y-6">
            {/* Billing Period */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <h3 className="text-sm font-medium text-slate-400 mb-2">Billing Period</h3>
              <p className="text-white">
                {formatDate(preview.periodStart)} - {formatDate(preview.periodEnd)}
              </p>
            </div>

            {/* Usage Breakdown */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <h3 className="text-sm font-medium text-slate-400 mb-3">Usage Breakdown</h3>
              {preview.usage.length === 0 ? (
                <p className="text-sm text-slate-500">No usage in this period</p>
              ) : (
                <div className="space-y-2">
                  {preview.usage.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-white">{getProductName(item.productId)}</span>
                        {item.tierName && (
                          <Badge className="border-slate-500/30 bg-slate-500/10 text-slate-400 text-xs">
                            {item.tierName}
                          </Badge>
                        )}
                        <span className="text-sm text-slate-500">
                          ({item.sessionCount} sessions × {item.creditsPerSession} cr)
                        </span>
                      </div>
                      <span className="font-medium text-white">
                        {item.totalCredits.toLocaleString()} credits
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between">
                    <span className="text-slate-400">Total Usage</span>
                    <span className="font-medium text-white">
                      {preview.totalUsageCredits.toLocaleString()} credits
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Previous Unpaid Invoices */}
            {preview.unpaidInvoices.length > 0 && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                <h3 className="text-sm font-medium text-amber-400 mb-3">Previous Unpaid Invoices</h3>
                <p className="text-xs text-amber-300/80 mb-3">
                  These will be marked as superseded and their balance included in this invoice.
                </p>
                <div className="space-y-2">
                  {preview.unpaidInvoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between">
                      <span className="font-mono text-sm text-amber-300">{inv.invoiceNumber}</span>
                      <span className="text-amber-300">
                        {inv.unpaidCredits.toLocaleString()} credits (RM {(inv.unpaidCredits / 10).toFixed(2)})
                      </span>
                    </div>
                  ))}
                  <div className="border-t border-amber-500/30 pt-2 mt-2 flex justify-between">
                    <span className="text-amber-400">Previous Balance</span>
                    <span className="font-medium text-amber-300">
                      {preview.previousBalanceCredits.toLocaleString()} credits
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Summary */}
            <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-white">Amount Due</h3>
                  <p className="text-sm text-slate-400">
                    Current balance: {preview.currentBalance.toLocaleString()} credits
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-white">
                    RM {preview.amountDueMyr.toFixed(2)}
                  </p>
                  <p className="text-sm text-slate-400">
                    {preview.amountDueCredits.toLocaleString()} credits
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={!canGenerate || generating}
            className="bg-linear-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600"
          >
            {generating ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate Invoice
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
