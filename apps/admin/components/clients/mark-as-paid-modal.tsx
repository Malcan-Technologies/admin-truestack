"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/utils";
import { toast } from "sonner";
import { CheckCircle } from "lucide-react";

interface MarkAsPaidModalProps {
  clientId: string;
  clientName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMarked?: () => void;
}

export function MarkAsPaidModal({
  clientId,
  clientName,
  open,
  onOpenChange,
  onMarked,
}: MarkAsPaidModalProps) {
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [paidAmountMyr, setPaidAmountMyr] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!periodStart || !periodEnd) {
      toast.error("Period start and end are required");
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiClient<{
        success: boolean;
        webhook_delivered: boolean;
        tenant_id: string;
        period_start: string;
        period_end: string;
      }>(`/api/admin/clients/${clientId}/mark-paid`, {
        method: "POST",
        body: JSON.stringify({
          period_start: periodStart,
          period_end: periodEnd,
          paid_amount_myr: paidAmountMyr ? parseFloat(paidAmountMyr) : undefined,
        }),
      });

      if (result.success) {
        toast.success(
          result.webhook_delivered
            ? "Marked as paid and webhook delivered to Kredit"
            : "Marked as paid (webhook delivery failed)"
        );
        setPeriodStart("");
        setPeriodEnd("");
        setPaidAmountMyr("");
        onOpenChange(false);
        onMarked?.();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to mark as paid";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-800 bg-slate-900 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Mark as Paid</DialogTitle>
          <DialogDescription className="text-slate-400">
            Record payment for {clientName}. This will trigger a signed webhook to
            TrueKredit.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="periodStart" className="text-slate-300">
              Period Start
            </Label>
            <Input
              id="periodStart"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="mt-1 border-slate-700 bg-slate-800 text-white"
              required
            />
          </div>
          <div>
            <Label htmlFor="periodEnd" className="text-slate-300">
              Period End
            </Label>
            <Input
              id="periodEnd"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="mt-1 border-slate-700 bg-slate-800 text-white"
              required
            />
          </div>
          <div>
            <Label htmlFor="paidAmountMyr" className="text-slate-300">
              Paid Amount (RM) - Optional
            </Label>
            <Input
              id="paidAmountMyr"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={paidAmountMyr}
              onChange={(e) => setPaidAmountMyr(e.target.value)}
              className="mt-1 border-slate-700 bg-slate-800 text-white"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-green-600 text-white hover:bg-green-700"
            >
              {submitting ? (
                "Marking..."
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Mark as Paid
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
