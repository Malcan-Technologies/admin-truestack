"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
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
import { Loader2, Key, Copy, Check } from "lucide-react";
import { apiClient } from "@/lib/utils";

interface GenerateApiKeyModalProps {
  clientId: string;
  trigger?: React.ReactNode;
  onKeyGenerated?: () => void;
}

interface GeneratedKey {
  id: string;
  key: string;
  displayKey: string;
  environment: string;
  productId: string;
}

export function GenerateApiKeyModal({ clientId, trigger, onKeyGenerated }: GenerateApiKeyModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [environment, setEnvironment] = useState<"live" | "test">("live");
  const [generatedKey, setGeneratedKey] = useState<GeneratedKey | null>(null);
  const [copied, setCopied] = useState(false);

  const resetForm = () => {
    setEnvironment("live");
    setError("");
    setLoading(false);
    setGeneratedKey(null);
    setCopied(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await apiClient<GeneratedKey>(`/api/admin/clients/${clientId}/api-keys`, {
        method: "POST",
        body: JSON.stringify({
          productId: "true_identity",
          environment,
        }),
      });

      setGeneratedKey(result);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (generatedKey?.key) {
      await navigator.clipboard.writeText(generatedKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    if (generatedKey) {
      onKeyGenerated?.();
    }
    resetForm();
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && generatedKey) {
      onKeyGenerated?.();
    }
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-linear-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600">
            <Key className="mr-2 h-4 w-4" />
            Generate Key
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md border-slate-800 bg-slate-900">
        <DialogHeader>
          <DialogTitle className="text-white">
            {generatedKey ? "API Key Generated" : "Generate API Key"}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {generatedKey
              ? "Copy this key now. It won't be shown again."
              : "Generate a new API key for TrueIdentity."}
          </DialogDescription>
        </DialogHeader>

        {generatedKey ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
              <p className="mb-2 text-sm font-medium text-amber-400">
                Save this key securely - it won't be shown again!
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 break-all rounded bg-slate-800 p-3 font-mono text-sm text-white">
                  {generatedKey.key}
                </code>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleCopy}
                  className="shrink-0 border-slate-700 bg-slate-800 hover:bg-slate-700"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-400" />
                  ) : (
                    <Copy className="h-4 w-4 text-slate-400" />
                  )}
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-400">Environment</p>
                <p className="font-medium text-white capitalize">{generatedKey.environment}</p>
              </div>
              <div>
                <p className="text-slate-400">Product</p>
                <p className="font-medium text-white">TrueIdentity</p>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button
                onClick={handleClose}
                className="bg-linear-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600"
              >
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-slate-200">Product</Label>
              <div className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white">
                TrueIdentity
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="environment" className="text-slate-200">
                Environment
              </Label>
              <Select value={environment} onValueChange={(v) => setEnvironment(v as "live" | "test")}>
                <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-slate-700 bg-slate-800">
                  <SelectItem value="live" className="text-white focus:bg-slate-700 focus:text-white">
                    Live
                  </SelectItem>
                  <SelectItem value="test" className="text-white focus:bg-slate-700 focus:text-white">
                    Test
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500">
                Test keys work with sandbox API. Live keys are for production.
              </p>
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
                className="bg-linear-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Key"
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
