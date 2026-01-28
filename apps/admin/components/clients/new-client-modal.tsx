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
import { Loader2, Plus } from "lucide-react";
import { apiClient } from "@/lib/utils";

interface NewClientModalProps {
  trigger?: React.ReactNode;
}

// Generate a client code from company name
function generateCodeFromName(name: string): string {
  // Remove common company suffixes and clean up
  const cleaned = name
    .replace(/\b(sdn\s*bhd|bhd|plt|llp|inc|corp|corporation|ltd|limited|llc|co|company)\b/gi, "")
    .trim();
  
  // Split into words and take first letters or first word
  const words = cleaned.split(/\s+/).filter(Boolean);
  
  if (words.length === 0) return "";
  
  if (words.length === 1) {
    // Single word: take up to first 10 chars
    return words[0].toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  }
  
  // Multiple words: take first letter of each word (up to 10 chars)
  const acronym = words
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
  
  return acronym;
}

export function NewClientModal({ trigger }: NewClientModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    contactEmail: "",
    contactPhone: "",
    companyRegistration: "",
    notes: "",
    initialCredits: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      contactEmail: "",
      contactPhone: "",
      companyRegistration: "",
      notes: "",
      initialCredits: "",
    });
    setError("");
    setLoading(false);
    setCodeManuallyEdited(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    if (name === "code") {
      // User is manually editing the code
      setCodeManuallyEdited(true);
      const processedValue = value.toUpperCase().replace(/[^A-Z0-9_]/g, "");
      setFormData((prev) => ({ ...prev, code: processedValue }));
      return;
    }
    
    if (name === "name") {
      // Auto-generate code from name if not manually edited
      setFormData((prev) => ({
        ...prev,
        name: value,
        code: codeManuallyEdited ? prev.code : generateCodeFromName(value),
      }));
      return;
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const initialCredits = formData.initialCredits
        ? parseInt(formData.initialCredits)
        : undefined;
      const client = await apiClient<{ id: string }>("/api/admin/clients", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          initialCredits: initialCredits && !isNaN(initialCredits) ? initialCredits : undefined,
        }),
      });

      setOpen(false);
      resetForm();
      router.push(`/clients/${client.id}`);
      router.refresh();
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600">
            <Plus className="mr-2 h-4 w-4" />
            New Client
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl border-slate-800 bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-white">New Client</DialogTitle>
          <DialogDescription className="text-slate-400">
            Create a new B2B client to issue API keys and enable KYC services.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-200">
                Company Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Acme Corporation"
                value={formData.name}
                onChange={handleChange}
                required
                className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="code" className="text-slate-200">
                Client Code <span className="text-red-400">*</span>
              </Label>
              <Input
                id="code"
                name="code"
                placeholder="ACME"
                value={formData.code}
                onChange={handleChange}
                required
                maxLength={20}
                className="border-slate-700 bg-slate-800 font-mono uppercase text-white placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500">
                Unique identifier. Uppercase letters, numbers, underscores only.
              </p>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="contactEmail" className="text-slate-200">
                Contact Email <span className="text-red-400">*</span>
              </Label>
              <Input
                id="contactEmail"
                name="contactEmail"
                type="email"
                placeholder="contact@acme.com"
                value={formData.contactEmail}
                onChange={handleChange}
                required
                className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactPhone" className="text-slate-200">
                Contact Phone <span className="text-red-400">*</span>
              </Label>
              <Input
                id="contactPhone"
                name="contactPhone"
                placeholder="+60123456789"
                value={formData.contactPhone}
                onChange={handleChange}
                required
                className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
              />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyRegistration" className="text-slate-200">
                Company Registration (SSM) <span className="text-red-400">*</span>
              </Label>
              <Input
                id="companyRegistration"
                name="companyRegistration"
                placeholder="123456-X"
                value={formData.companyRegistration}
                onChange={handleChange}
                required
                className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="initialCredits" className="text-slate-200">
                Initial Credits (Included)
              </Label>
              <Input
                id="initialCredits"
                name="initialCredits"
                type="number"
                placeholder="0"
                min="0"
                value={formData.initialCredits}
                onChange={handleChange}
                className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
              />
              <p className="text-xs text-slate-500">
                Credits included with the account (optional).
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-slate-200">
              Internal Notes
            </Label>
            <Textarea
              id="notes"
              name="notes"
              placeholder="Any internal notes about this client..."
              value={formData.notes}
              onChange={handleChange}
              rows={3}
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
                  Creating...
                </>
              ) : (
                "Create Client"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
