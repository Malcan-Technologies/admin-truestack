"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, CreditCard } from "lucide-react";
import { apiClient } from "@/lib/utils";

interface TopupCreditsModalProps {
  clientId: string;
  clientName: string;
  currentBalance: number;
  trigger?: React.ReactNode;
}

export function TopupCreditsModal({
  clientId,
  clientName,
  currentBalance,
  trigger,
}: TopupCreditsModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    amount: "",
    type: "topup" as "topup" | "adjustment" | "refund",
    description: "",
  });

  const resetForm = () => {
    setFormData({
      amount: "",
      type: "topup",
      description: "",
    });
    setError("");
    setLoading(false);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const amount = parseInt(formData.amount);
    if (isNaN(amount) || amount === 0) {
      setError("Please enter a valid amount");
      setLoading(false);
      return;
    }

    try {
      await apiClient(`/api/admin/clients/${clientId}/credits`, {
        method: "POST",
        body: JSON.stringify({
          productId: "true_identity",
          amount,
          type: formData.type,
          description: formData.description || null,
        }),
      });

      setSuccess(true);
      setTimeout(() => {
        setOpen(false);
        router.refresh();
        resetForm();
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const newBalance = currentBalance + (parseInt(formData.amount) || 0);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600">
            <CreditCard className="mr-2 h-4 w-4" />
            Top Up Credits
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md border-slate-800 bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-white">
            {success ? "Credits Added" : "Top Up Credits"}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {success
              ? "Credits have been added successfully."
              : `Add credits for ${clientName}`}
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-center">
              <p className="text-lg font-semibold text-green-400">
                +{parseInt(formData.amount).toLocaleString()} credits
              </p>
              <p className="mt-1 text-sm text-slate-400">
                New balance: {newBalance.toLocaleString()}
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Current Balance</span>
                <span className="text-xl font-semibold text-white">
                  {currentBalance.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type" className="text-slate-200">
                Transaction Type
              </Label>
              <Select
                value={formData.type}
                onValueChange={(v) =>
                  setFormData((prev) => ({ ...prev, type: v as typeof prev.type }))
                }
              >
                <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-800">
                  <SelectItem value="topup" className="text-white focus:bg-slate-700 focus:text-white">
                    Top Up
                  </SelectItem>
                  <SelectItem value="adjustment" className="text-white focus:bg-slate-700 focus:text-white">
                    Adjustment
                  </SelectItem>
                  <SelectItem value="refund" className="text-white focus:bg-slate-700 focus:text-white">
                    Refund
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount" className="text-slate-200">
                Amount <span className="text-red-400">*</span>
              </Label>
              <Input
                id="amount"
                type="number"
                placeholder="100"
                value={formData.amount}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, amount: e.target.value }))
                }
                required
                className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500">
                Enter positive number to add credits, negative to deduct.
              </p>
            </div>

            {formData.amount && !isNaN(parseInt(formData.amount)) && (
              <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">New Balance</span>
                  <span
                    className={`text-xl font-semibold ${
                      newBalance >= 0 ? "text-green-400" : "text-red-400"
                    }`}
                  >
                    {newBalance.toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="description" className="text-slate-200">
                Description
              </Label>
              <Textarea
                id="description"
                placeholder="e.g., Invoice #12345, Monthly top-up..."
                value={formData.description}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, description: e.target.value }))
                }
                rows={2}
                className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
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
                disabled={loading}
                className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "Add Credits"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
