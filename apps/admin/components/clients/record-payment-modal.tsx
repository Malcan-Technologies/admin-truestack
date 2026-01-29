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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { apiClient, formatDate } from "@/lib/utils";
import { DollarSign, RefreshCw } from "lucide-react";

type Invoice = {
  id: string;
  invoice_number: string;
  amount_due_credits: number;
  amount_due_myr: string;
  amount_paid_credits: number;
  amount_paid_myr: string;
  due_date: string;
  status: string;
};

interface RecordPaymentModalProps {
  clientId: string;
  invoiceId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPaymentRecorded: () => void;
}

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "fpx", label: "FPX" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

export function RecordPaymentModal({
  clientId,
  invoiceId,
  open,
  onOpenChange,
  onPaymentRecorded,
}: RecordPaymentModalProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);

  // Form state
  const [amountMyr, setAmountMyr] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");

  const remainingCredits = invoice
    ? invoice.amount_due_credits - invoice.amount_paid_credits
    : 0;
  const remainingMyr = remainingCredits / 10;

  const fetchInvoice = useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const data = await apiClient<{ invoice: Invoice }>(
        `/api/admin/clients/${clientId}/invoices/${invoiceId}`
      );
      setInvoice(data.invoice);
      // Set default values
      setAmountMyr((data.invoice.amount_due_credits - data.invoice.amount_paid_credits) / 10 + "");
      setPaymentDate(new Date().toISOString().split("T")[0]);
    } catch (error) {
      toast.error("Failed to load invoice details");
    } finally {
      setLoading(false);
    }
  }, [clientId, invoiceId]);

  useEffect(() => {
    if (open && invoiceId) {
      fetchInvoice();
      // Reset form
      setAmountMyr("");
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setPaymentMethod("");
      setPaymentReference("");
      setNotes("");
    }
  }, [open, invoiceId, fetchInvoice]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceId || !invoice) return;

    const amount = parseFloat(amountMyr);
    if (isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // For zero-amount invoices, allow 0 payment
    // For other invoices, require positive amount
    if (remainingMyr > 0 && amount <= 0) {
      toast.error("Please enter an amount greater than 0");
      return;
    }

    // Allow overpayment - excess will be credited to the client
    if (amount > remainingMyr && remainingMyr > 0) {
      const excess = amount - remainingMyr;
      const confirmOverpay = window.confirm(
        `This payment exceeds the remaining balance by RM ${excess.toFixed(2)}. ` +
        `The excess will be credited to the client's account. Continue?`
      );
      if (!confirmOverpay) return;
    }

    if (!paymentDate) {
      toast.error("Please select a payment date");
      return;
    }

    setSubmitting(true);
    try {
      const amountCredits = Math.round(amount * 10);
      await apiClient(`/api/admin/clients/${clientId}/invoices/${invoiceId}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amountCredits,
          paymentDate,
          paymentMethod: paymentMethod || undefined,
          paymentReference: paymentReference || undefined,
          notes: notes || undefined,
        }),
      });

      toast.success("Payment recorded successfully");
      onPaymentRecorded();
      onOpenChange(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-800 bg-slate-900 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Record Payment
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {invoice ? `Invoice ${invoice.invoice_number}` : "Loading..."}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 text-slate-600 animate-spin" />
          </div>
        ) : invoice ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Invoice Summary */}
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Amount Due</span>
                <span className="text-white">
                  RM {parseFloat(invoice.amount_due_myr).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Amount Paid</span>
                <span className="text-green-400">
                  RM {parseFloat(invoice.amount_paid_myr).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t border-slate-700 pt-2">
                <span className="text-slate-400">Remaining</span>
                <span className="text-amber-400 font-medium">
                  RM {remainingMyr.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Due Date</span>
                <span className="text-white">{formatDate(invoice.due_date)}</span>
              </div>
            </div>

            {/* Payment Amount */}
            <div className="space-y-2">
              <Label htmlFor="amount" className="text-white">
                Payment Amount (RM) *
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min={remainingMyr === 0 ? "0" : "0.01"}
                value={amountMyr}
                onChange={(e) => setAmountMyr(e.target.value)}
                placeholder={remainingMyr > 0 ? `Remaining: RM ${remainingMyr.toFixed(2)}` : "RM 0.00"}
                className="border-slate-700 bg-slate-800 text-white"
                required={remainingMyr > 0}
              />
              <p className="text-xs text-slate-500">
                {amountMyr && !isNaN(parseFloat(amountMyr))
                  ? `= ${Math.round(parseFloat(amountMyr) * 10).toLocaleString()} credits`
                  : ""}
              </p>
            </div>

            {/* Payment Date */}
            <div className="space-y-2">
              <Label htmlFor="paymentDate" className="text-white">
                Payment Date *
              </Label>
              <Input
                id="paymentDate"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="border-slate-700 bg-slate-800 text-white"
                required
              />
            </div>

            {/* Payment Method */}
            <div className="space-y-2">
              <Label htmlFor="paymentMethod" className="text-white">
                Payment Method
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-800">
                  {PAYMENT_METHODS.map((method) => (
                    <SelectItem
                      key={method.value}
                      value={method.value}
                      className="text-white hover:bg-slate-700"
                    >
                      {method.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Payment Reference */}
            <div className="space-y-2">
              <Label htmlFor="paymentReference" className="text-white">
                Reference / Transaction ID
              </Label>
              <Input
                id="paymentReference"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="e.g., Transaction ID, Cheque #"
                className="border-slate-700 bg-slate-800 text-white"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes" className="text-white">
                Notes
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes about this payment"
                className="border-slate-700 bg-slate-800 text-white min-h-[80px]"
              />
            </div>

            <DialogFooter className="pt-4">
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
                className="bg-linear-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Recording...
                  </>
                ) : (
                  <>
                    <DollarSign className="mr-2 h-4 w-4" />
                    Record Payment
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
