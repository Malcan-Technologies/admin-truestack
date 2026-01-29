"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { apiClient } from "@/lib/utils";
import { DollarSign, RefreshCw, Banknote } from "lucide-react";

interface AdvancePaymentModalProps {
  clientId: string;
  clientName: string;
  currentBalance: number;
  onPaymentRecorded: () => void;
  trigger?: React.ReactNode;
}

const PAYMENT_METHODS = [
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "fpx", label: "FPX" },
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "other", label: "Other" },
];

const SST_RATE = 0.08;

export function AdvancePaymentModal({
  clientId,
  clientName,
  currentBalance,
  onPaymentRecorded,
  trigger,
}: AdvancePaymentModalProps) {
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state - amountMyr is the TOTAL amount received (including SST)
  const [amountMyr, setAmountMyr] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");

  // Back-calculate base amount from total amount entered (total includes SST)
  const totalAmountEntered = parseFloat(amountMyr) || 0;
  const rawBaseAmountMyr = totalAmountEntered / (1 + SST_RATE);
  const baseAmountCredits = Math.round(rawBaseAmountMyr * 10);
  
  // Recalculate the actual amounts based on the rounded credits
  const actualBaseAmountMyr = baseAmountCredits / 10;
  const actualSstAmountMyr = Math.round(actualBaseAmountMyr * SST_RATE * 100) / 100;
  const actualTotalMyr = actualBaseAmountMyr + actualSstAmountMyr;
  
  // Calculate the rounding difference
  const roundingDifference = totalAmountEntered - actualTotalMyr;
  const hasRoundingDifference = Math.abs(roundingDifference) >= 0.01;

  // New balance after payment
  const newBalance = currentBalance + baseAmountCredits;

  const resetForm = useCallback(() => {
    setAmountMyr("");
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setPaymentMethod("");
    setPaymentReference("");
    setNotes("");
  }, []);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const totalAmount = parseFloat(amountMyr);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      toast.error("Please enter a valid amount greater than 0");
      return;
    }

    if (!paymentDate) {
      toast.error("Please select a payment date");
      return;
    }

    setSubmitting(true);
    try {
      const result = await apiClient<{ receiptUrl?: string; receiptNumber: string }>(
        `/api/admin/clients/${clientId}/advance-payments`,
        {
          method: "POST",
          body: JSON.stringify({
            amountCredits: baseAmountCredits,
            paymentDate,
            paymentMethod: paymentMethod || undefined,
            paymentReference: paymentReference || undefined,
            notes: notes || undefined,
          }),
        }
      );

      toast.success(`Advance payment recorded. Receipt: ${result.receiptNumber}`);
      onPaymentRecorded();
      setOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <Banknote className="mr-2 h-4 w-4" />
            Advance Payment
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="border-slate-800 bg-slate-900 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Banknote className="h-5 w-5" />
            Record Advance Payment
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Record a prepayment for {clientName}. A receipt will be generated.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Balance */}
          <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Current Balance</span>
              <span className="text-white font-medium">
                {currentBalance.toLocaleString()} credits (RM {(currentBalance / 10).toFixed(2)})
              </span>
            </div>
          </div>

          {/* Payment Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount" className="text-white">
              Total Amount Received (RM) *
            </Label>
            <p className="text-xs text-slate-500">
              Enter the total amount paid by the client (including 8% SST)
            </p>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              value={amountMyr}
              onChange={(e) => setAmountMyr(e.target.value)}
              placeholder="e.g., 108.00"
              className="border-slate-700 bg-slate-800 text-white"
              required
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
                    <span>SST (8%):</span>
                    <span>RM {actualSstAmountMyr.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-slate-400">
                    <span>Recorded total:</span>
                    <span>RM {actualTotalMyr.toFixed(2)}</span>
                  </div>
                </div>

                {/* Credits to add */}
                <div className="space-y-1 border-t border-slate-600 pt-2">
                  <div className="flex justify-between">
                    <span>Credits to add:</span>
                    <span className="text-green-400 font-medium">
                      +{baseAmountCredits.toLocaleString()} credits
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>New balance:</span>
                    <span className="text-white font-medium">
                      {newBalance.toLocaleString()} credits (RM {(newBalance / 10).toFixed(2)})
                    </span>
                  </div>
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
              placeholder="Optional notes about this advance payment"
              className="border-slate-700 bg-slate-800 text-white min-h-[80px]"
            />
          </div>

          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
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
      </DialogContent>
    </Dialog>
  );
}
