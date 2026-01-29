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
  sst_rate: string;
  sst_amount_myr: string;
  total_with_sst_myr: string;
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

  // Form state - amountMyr is the TOTAL amount received (including SST)
  const [amountMyr, setAmountMyr] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");

  // Calculate remaining amounts including SST
  const sstRate = invoice ? parseFloat(invoice.sst_rate) : 0.08;
  const remainingCredits = invoice
    ? invoice.amount_due_credits - invoice.amount_paid_credits
    : 0;
  const remainingBaseMyr = remainingCredits / 10;
  const remainingSstMyr = remainingBaseMyr * sstRate;
  const remainingTotalMyr = remainingBaseMyr + remainingSstMyr;

  // Back-calculate base amount from total amount entered (total includes SST)
  // Since credits are integers, we use standard rounding for fairness
  const totalAmountEntered = parseFloat(amountMyr) || 0;
  const rawBaseAmountMyr = totalAmountEntered / (1 + sstRate);
  const baseAmountCredits = Math.round(rawBaseAmountMyr * 10); // Standard rounding for fairness
  
  // Recalculate the actual amounts based on the rounded credits
  const actualBaseAmountMyr = baseAmountCredits / 10;
  const actualSstAmountMyr = Math.round(actualBaseAmountMyr * sstRate * 100) / 100;
  const actualTotalMyr = actualBaseAmountMyr + actualSstAmountMyr;
  
  // Calculate the rounding difference (what's "lost" due to rounding)
  const roundingDifference = totalAmountEntered - actualTotalMyr;
  const hasRoundingDifference = Math.abs(roundingDifference) >= 0.01;

  // Calculate payment allocation (how credits will be applied)
  const invoicePortionCredits = Math.min(baseAmountCredits, remainingCredits);
  const excessCredits = Math.max(0, baseAmountCredits - remainingCredits);
  const invoicePortionMyr = invoicePortionCredits / 10;
  const excessMyr = excessCredits / 10;
  
  // Determine payment type
  const isPartialPayment = baseAmountCredits > 0 && baseAmountCredits < remainingCredits;
  const isOverpayment = baseAmountCredits > remainingCredits && remainingCredits > 0;
  const isExactPayment = baseAmountCredits === remainingCredits;

  const fetchInvoice = useCallback(async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const data = await apiClient<{ invoice: Invoice }>(
        `/api/admin/clients/${clientId}/invoices/${invoiceId}`
      );
      setInvoice(data.invoice);
      // Set default values - use total with SST as the default amount
      const remainingBase = (data.invoice.amount_due_credits - data.invoice.amount_paid_credits) / 10;
      const invoiceSstRate = parseFloat(data.invoice.sst_rate);
      const remainingTotal = remainingBase * (1 + invoiceSstRate);
      setAmountMyr(remainingTotal.toFixed(2));
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

    const totalAmount = parseFloat(amountMyr);
    if (isNaN(totalAmount) || totalAmount < 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // For zero-amount invoices, allow 0 payment
    // For other invoices, require positive amount
    if (remainingTotalMyr > 0 && totalAmount <= 0) {
      toast.error("Please enter an amount greater than 0");
      return;
    }

    // Allow overpayment - excess will be credited to the client
    if (baseAmountCredits > remainingCredits && remainingCredits > 0) {
      const confirmOverpay = window.confirm(
        `This payment exceeds the invoice balance.\n\n` +
        `Payment breakdown:\n` +
        `• ${invoicePortionCredits.toLocaleString()} credits (RM ${invoicePortionMyr.toFixed(2)}) will pay off the invoice\n` +
        `• ${excessCredits.toLocaleString()} credits (RM ${excessMyr.toFixed(2)}) will be added as account credit\n\n` +
        `Total recorded: RM ${actualTotalMyr.toFixed(2)} (incl. SST)\n\n` +
        `Continue?`
      );
      if (!confirmOverpay) return;
    }

    if (!paymentDate) {
      toast.error("Please select a payment date");
      return;
    }

    setSubmitting(true);
    try {
      // Send the base amount (excluding SST) as credits
      // The backend will calculate SST on top of this for the receipt
      await apiClient(`/api/admin/clients/${clientId}/invoices/${invoiceId}/payments`, {
        method: "POST",
        body: JSON.stringify({
          amountCredits: baseAmountCredits,
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
                <span className="text-slate-400">Subtotal</span>
                <span className="text-white">
                  RM {parseFloat(invoice.amount_due_myr).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">SST ({Math.round(sstRate * 100)}%)</span>
                <span className="text-white">
                  RM {parseFloat(invoice.sst_amount_myr).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm font-medium border-t border-slate-700 pt-2">
                <span className="text-slate-400">Total Amount Due</span>
                <span className="text-white">
                  RM {parseFloat(invoice.total_with_sst_myr).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Amount Paid</span>
                <span className="text-green-400">
                  RM {(parseFloat(invoice.amount_paid_myr) * (1 + sstRate)).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-sm border-t border-slate-700 pt-2">
                <span className="text-slate-400">Remaining (incl. SST)</span>
                <span className="text-amber-400 font-medium">
                  RM {remainingTotalMyr.toFixed(2)}
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
                Total Amount Received (RM) *
              </Label>
              <p className="text-xs text-slate-500">
                Enter the total amount paid by the client (including SST)
              </p>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min={remainingTotalMyr === 0 ? "0" : "0.01"}
                value={amountMyr}
                onChange={(e) => setAmountMyr(e.target.value)}
                placeholder={remainingTotalMyr > 0 ? `RM ${remainingTotalMyr.toFixed(2)}` : "RM 0.00"}
                className="border-slate-700 bg-slate-800 text-white"
                required={remainingTotalMyr > 0}
              />
              {amountMyr && !isNaN(parseFloat(amountMyr)) && parseFloat(amountMyr) > 0 && (
                <div className="text-xs text-slate-500 space-y-2 rounded-md bg-slate-800/50 p-3 border border-slate-700">
                  {/* Rounding notice */}
                  {hasRoundingDifference && (
                    <div className="rounded bg-slate-700/50 border border-slate-600 p-2 text-slate-400">
                      <p>
                        <span className="font-medium">Note:</span> Credits are whole numbers. 
                        Recorded total differs by RM {Math.abs(roundingDifference).toFixed(2)} due to rounding.
                      </p>
                    </div>
                  )}
                  
                  {/* Payment Breakdown */}
                  <div className="space-y-1">
                    <p className="text-slate-400 font-medium">Payment Breakdown:</p>
                    <div className="flex justify-between">
                      <span>Base amount (excl. SST):</span>
                      <span>RM {actualBaseAmountMyr.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>SST ({Math.round(sstRate * 100)}%):</span>
                      <span>RM {actualSstAmountMyr.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium text-slate-400">
                      <span>Recorded total:</span>
                      <span>RM {actualTotalMyr.toFixed(2)}</span>
                    </div>
                  </div>

                  {/* Payment Allocation */}
                  <div className="space-y-1 border-t border-slate-600 pt-2">
                    <p className="text-slate-400 font-medium">How this payment will be applied:</p>
                    
                    {/* Invoice portion */}
                    <div className="flex justify-between">
                      <span>Applied to invoice:</span>
                      <span className="text-green-400">
                        {invoicePortionCredits.toLocaleString()} credits (RM {invoicePortionMyr.toFixed(2)})
                      </span>
                    </div>
                    
                    {/* Overpayment credit */}
                    {isOverpayment && (
                      <div className="flex justify-between">
                        <span>Excess credited to account:</span>
                        <span className="text-blue-400">
                          {excessCredits.toLocaleString()} credits (RM {excessMyr.toFixed(2)})
                        </span>
                      </div>
                    )}
                    
                    {/* Partial payment warning */}
                    {isPartialPayment && (
                      <div className="flex justify-between text-amber-400">
                        <span>Remaining after payment:</span>
                        <span>
                          {(remainingCredits - invoicePortionCredits).toLocaleString()} credits
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Status indicator */}
                  <div className="border-t border-slate-600 pt-2">
                    {isExactPayment && (
                      <p className="text-green-400 font-medium">
                        This will fully pay the invoice
                      </p>
                    )}
                    {isPartialPayment && (
                      <p className="text-amber-400 font-medium">
                        Partial payment - invoice will remain open
                      </p>
                    )}
                    {isOverpayment && (
                      <p className="text-blue-400 font-medium">
                        Overpayment - excess will be added as account credit
                      </p>
                    )}
                  </div>
                </div>
              )}
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
