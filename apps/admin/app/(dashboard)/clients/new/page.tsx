"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { apiClient } from "@/lib/utils";

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    code: "",
    contactEmail: "",
    contactPhone: "",
    companyRegistration: "",
    notes: "",
  });

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    // Auto-uppercase the code field
    const processedValue = name === "code" ? value.toUpperCase().replace(/[^A-Z0-9_]/g, "") : value;
    setFormData((prev) => ({ ...prev, [name]: processedValue }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const client = await apiClient<{ id: string }>("/api/admin/clients", {
        method: "POST",
        body: JSON.stringify(formData),
      });

      router.push(`/clients/${client.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/clients"
          className="inline-flex items-center text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Clients
        </Link>
      </div>

      <PageHeader
        title="New Client"
        description="Create a new B2B client to issue API keys and enable KYC services."
      />

      <Card className="max-w-2xl border-slate-800 bg-slate-900/50">
        <CardHeader>
          <CardTitle className="text-white">Client Details</CardTitle>
          <CardDescription className="text-slate-400">
            Enter the client's business information. A unique code will be used to identify this client in API requests.
          </CardDescription>
        </CardHeader>
        <CardContent>
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

            <div className="flex gap-3 pt-4">
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
              <Link href="/clients">
                <Button
                  type="button"
                  variant="outline"
                  className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
