"use client";

import { useState, useEffect } from "react";
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
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Loader2 } from "lucide-react";
import { apiClient } from "@/lib/utils";
import { toast } from "sonner";

type Client = {
  id: string;
  name: string;
  code: string;
  status: "active" | "suspended";
  contact_email: string | null;
  contact_phone: string | null;
  company_registration: string | null;
  notes: string | null;
};

interface EditClientModalProps {
  client: Client;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditClientModal({
  client,
  open,
  onOpenChange,
}: EditClientModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    contactEmail: "",
    contactPhone: "",
    companyRegistration: "",
    notes: "",
    status: "active" as "active" | "suspended",
  });

  useEffect(() => {
    if (open && client) {
      setFormData({
        name: client.name ?? "",
        contactEmail: client.contact_email ?? "",
        contactPhone: client.contact_phone ?? "",
        companyRegistration: client.company_registration ?? "",
        notes: client.notes ?? "",
        status: (client.status as "active" | "suspended") ?? "active",
      });
      setError("");
    }
  }, [open, client]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await apiClient(`/api/admin/clients/${client.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: formData.name.trim() || undefined,
          contactEmail: formData.contactEmail.trim() || undefined,
          contactPhone: formData.contactPhone.trim() || undefined,
          companyRegistration: formData.companyRegistration.trim() || undefined,
          notes: formData.notes.trim() || undefined,
          status: formData.status,
        }),
      });

      toast.success("Client updated successfully");
      router.refresh();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update client");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-slate-800 bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Client</DialogTitle>
          <DialogDescription className="text-slate-400">
            Update client information. Code cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {error && (
            <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex items-center gap-2 text-slate-400">
            <Building2 className="h-5 w-5" />
            <span className="text-sm font-medium">Client Information</span>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-slate-200">
                Company Name
              </Label>
              <Input
                id="name"
                name="name"
                placeholder="Acme Corporation"
                value={formData.name}
                onChange={handleChange}
                className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-slate-200">Client Code</Label>
              <Input
                value={client.code}
                disabled
                className="border-slate-700 bg-slate-800/50 text-slate-500"
              />
              <p className="text-xs text-slate-500">Code cannot be changed.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="contactEmail" className="text-slate-200">
                  Contact Email
                </Label>
                <Input
                  id="contactEmail"
                  name="contactEmail"
                  type="email"
                  placeholder="contact@acme.com"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactPhone" className="text-slate-200">
                  Contact Phone
                </Label>
                <Input
                  id="contactPhone"
                  name="contactPhone"
                  placeholder="+60123456789"
                  value={formData.contactPhone}
                  onChange={handleChange}
                  className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="companyRegistration" className="text-slate-200">
                Company Registration (SSM)
              </Label>
              <Input
                id="companyRegistration"
                name="companyRegistration"
                placeholder="123456-X"
                value={formData.companyRegistration}
                onChange={handleChange}
                className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status" className="text-slate-200">
                Status
              </Label>
              <Select
                value={formData.status}
                onValueChange={(v) =>
                  setFormData((prev) => ({
                    ...prev,
                    status: v as "active" | "suspended",
                  }))
                }
              >
                <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-800">
                  <SelectItem
                    value="active"
                    className="text-white focus:bg-slate-700 focus:text-white"
                  >
                    Active
                  </SelectItem>
                  <SelectItem
                    value="suspended"
                    className="text-white focus:bg-slate-700 focus:text-white"
                  >
                    Suspended
                  </SelectItem>
                </SelectContent>
              </Select>
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
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-800 pt-4">
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
              disabled={loading}
              className="bg-linear-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
