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
import { Stepper } from "@/components/ui/stepper";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Key, CreditCard, CheckCircle2, Building2, ArrowRight, ArrowLeft, Copy, Check, DollarSign, Trash2 } from "lucide-react";
import { apiClient } from "@/lib/utils";

interface NewClientModalProps {
  trigger?: React.ReactNode;
}

// Generate a client code from company name
function generateCodeFromName(name: string): string {
  const cleaned = name
    .replace(/\b(sdn\s*bhd|bhd|plt|llp|inc|corp|corporation|ltd|limited|llc|co|company)\b/gi, "")
    .trim();
  
  const words = cleaned.split(/\s+/).filter(Boolean);
  
  if (words.length === 0) return "";
  
  if (words.length === 1) {
    return words[0].toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
  }
  
  const acronym = words
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 10);
  
  return acronym;
}

const STEPS = [
  { id: "details", title: "Details" },
  { id: "api-key", title: "API Key" },
  { id: "pricing", title: "Pricing" },
  { id: "credits", title: "Credits" },
  { id: "review", title: "Review" },
];

type ApiKeyConfig = {
  generate: boolean;
  environment: "live" | "test";
};

type CreditsConfig = {
  amount: string;
  type: "included" | "topup";
};

type PricingTier = {
  tierName: string;
  minVolume: number;
  maxVolume: number | null;
  pricePerUnit: string;
};

type PricingConfig = {
  allowOverdraft: boolean;
  tiers: PricingTier[];
};

type CreationResult = {
  client: { id: string; name: string; code: string };
  apiKey: { key: string; displayKey: string; environment: string } | null;
};

export function NewClientModal({ trigger }: NewClientModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [codeManuallyEdited, setCodeManuallyEdited] = useState(false);
  const [creationResult, setCreationResult] = useState<CreationResult | null>(null);
  const [copied, setCopied] = useState(false);

  // Step 1: Client details
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    contactEmail: "",
    contactPhone: "",
    companyRegistration: "",
    notes: "",
  });

  // Step 2: API Key configuration
  const [apiKeyConfig, setApiKeyConfig] = useState<ApiKeyConfig>({
    generate: true,
    environment: "live",
  });

  // Step 3: Pricing configuration
  const [pricingConfig, setPricingConfig] = useState<PricingConfig>({
    allowOverdraft: true,
    tiers: [{ tierName: "Standard", minVolume: 0, maxVolume: null, pricePerUnit: "5.00" }],
  });

  // Step 4: Credits configuration
  const [creditsConfig, setCreditsConfig] = useState<CreditsConfig>({
    amount: "",
    type: "included",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      code: "",
      contactEmail: "",
      contactPhone: "",
      companyRegistration: "",
      notes: "",
    });
    setApiKeyConfig({ generate: true, environment: "live" });
    setPricingConfig({
      allowOverdraft: true,
      tiers: [{ tierName: "Standard", minVolume: 0, maxVolume: null, pricePerUnit: "5.00" }],
    });
    setCreditsConfig({ amount: "", type: "included" });
    setCurrentStep(0);
    setError("");
    setLoading(false);
    setCodeManuallyEdited(false);
    setCreationResult(null);
    setCopied(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    
    if (name === "code") {
      setCodeManuallyEdited(true);
      const processedValue = value.toUpperCase().replace(/[^A-Z0-9_]/g, "");
      setFormData((prev) => ({ ...prev, code: processedValue }));
      return;
    }
    
    if (name === "name") {
      setFormData((prev) => ({
        ...prev,
        name: value,
        code: codeManuallyEdited ? prev.code : generateCodeFromName(value),
      }));
      return;
    }
    
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateStep = (step: number): boolean => {
    setError("");
    
    if (step === 0) {
      if (!formData.name.trim()) {
        setError("Company name is required");
        return false;
      }
      if (!formData.code.trim()) {
        setError("Client code is required");
        return false;
      }
      if (!formData.contactEmail.trim()) {
        setError("Contact email is required");
        return false;
      }
      if (!formData.contactPhone.trim()) {
        setError("Contact phone is required");
        return false;
      }
      if (!formData.companyRegistration.trim()) {
        setError("Company registration (SSM) is required");
        return false;
      }
    }
    
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setError("");
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      const initialCredits = creditsConfig.amount
        ? parseInt(creditsConfig.amount)
        : undefined;

      // Create the client with all configuration
      const result = await apiClient<CreationResult>("/api/admin/clients", {
        method: "POST",
        body: JSON.stringify({
          ...formData,
          initialCredits: initialCredits && !isNaN(initialCredits) ? initialCredits : undefined,
          initialCreditsType: creditsConfig.type,
          generateApiKey: apiKeyConfig.generate,
          apiKeyEnvironment: apiKeyConfig.environment,
          allowOverdraft: pricingConfig.allowOverdraft,
          pricingTiers: pricingConfig.tiers.map((tier) => ({
            tierName: tier.tierName,
            minVolume: tier.minVolume,
            maxVolume: tier.maxVolume,
            pricePerUnit: parseFloat(tier.pricePerUnit),
          })),
        }),
      });

      setCreationResult(result);
      setLoading(false);
      // Move to success step
      setCurrentStep(STEPS.length);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  const handleCopyApiKey = async () => {
    if (creationResult?.apiKey?.key) {
      await navigator.clipboard.writeText(creationResult.apiKey.key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleFinish = () => {
    if (creationResult) {
      router.push(`/clients/${creationResult.client.id}`);
      router.refresh();
    }
    setOpen(false);
    resetForm();
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <DetailsStep formData={formData} onChange={handleChange} />;
      case 1:
        return <ApiKeyStep config={apiKeyConfig} onChange={setApiKeyConfig} />;
      case 2:
        return <PricingStep config={pricingConfig} onChange={setPricingConfig} />;
      case 3:
        return <CreditsStep config={creditsConfig} onChange={setCreditsConfig} />;
      case 4:
        return (
          <ReviewStep
            formData={formData}
            apiKeyConfig={apiKeyConfig}
            pricingConfig={pricingConfig}
            creditsConfig={creditsConfig}
          />
        );
      case 5:
        // Success step
        return (
          <SuccessStep
            result={creationResult}
            copied={copied}
            onCopy={handleCopyApiKey}
          />
        );
      default:
        return null;
    }
  };

  const isLastStep = currentStep === STEPS.length - 1;
  const isSuccessStep = currentStep === STEPS.length;

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
      <DialogContent size="6xl" className="border-slate-800 bg-slate-900 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isSuccessStep ? "Client Created Successfully" : "New Client"}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {isSuccessStep
              ? "Your new client has been created and is ready to use."
              : "Create a new B2B client with API access and credits."}
          </DialogDescription>
        </DialogHeader>

        {!isSuccessStep && (
          <>
            <div className="mt-4 pb-6">
              <Stepper steps={STEPS} currentStep={currentStep} />
            </div>
            <div className="border-t border-slate-700" />
          </>
        )}

        <div className="mt-6 min-h-[400px] py-2">
          {error && (
            <div className="mb-4 rounded-md bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </div>
          )}
          {renderStepContent()}
        </div>

        {isSuccessStep ? (
          <div className="flex justify-end border-t border-slate-800 pt-4">
            <Button
              onClick={handleFinish}
              className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600"
            >
              Go to Client
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex justify-between border-t border-slate-800 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={currentStep === 0 ? () => setOpen(false) : handleBack}
              className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              {currentStep === 0 ? (
                "Cancel"
              ) : (
                <>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </>
              )}
            </Button>
            <Button
              onClick={isLastStep ? handleSubmit : handleNext}
              disabled={loading}
              className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : isLastStep ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Create Client
                </>
              ) : (
                <>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Step 1: Client Details
function DetailsStep({
  formData,
  onChange,
}: {
  formData: {
    name: string;
    code: string;
    contactEmail: string;
    contactPhone: string;
    companyRegistration: string;
    notes: string;
  };
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-slate-400">
        <Building2 className="h-5 w-5" />
        <span className="text-sm font-medium">Client Information</span>
      </div>

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
            onChange={onChange}
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
            onChange={onChange}
            maxLength={20}
            className="border-slate-700 bg-slate-800 font-mono uppercase text-white placeholder:text-slate-500"
          />
          <p className="text-xs text-slate-500">
            Auto-generated from name. Uppercase letters, numbers, underscores only.
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
            onChange={onChange}
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
            onChange={onChange}
            className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="companyRegistration" className="text-slate-200">
          Company Registration (SSM) <span className="text-red-400">*</span>
        </Label>
        <Input
          id="companyRegistration"
          name="companyRegistration"
          placeholder="123456-X"
          value={formData.companyRegistration}
          onChange={onChange}
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
          onChange={onChange}
          rows={2}
          className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
        />
      </div>
    </div>
  );
}

// Step 2: API Key Configuration
function ApiKeyStep({
  config,
  onChange,
}: {
  config: ApiKeyConfig;
  onChange: (config: ApiKeyConfig) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-slate-400">
        <Key className="h-5 w-5" />
        <span className="text-sm font-medium">API Key Configuration</span>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            id="generateApiKey"
            checked={config.generate}
            onChange={(e) => onChange({ ...config, generate: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500"
          />
          <div className="flex-1">
            <Label htmlFor="generateApiKey" className="text-white cursor-pointer">
              Generate API Key on creation
            </Label>
            <p className="mt-1 text-sm text-slate-400">
              Create an API key for TrueIdentity immediately after the client is created.
            </p>
          </div>
        </div>
      </div>

      {config.generate && (
        <div className="space-y-4 pl-8">
          <div className="space-y-2">
            <Label className="text-slate-200">Product</Label>
            <div className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-white">
              TrueIdentity
            </div>
            <p className="text-xs text-slate-500">
              Currently, only TrueIdentity product is available.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="environment" className="text-slate-200">
              Environment
            </Label>
            <Select
              value={config.environment}
              onValueChange={(v) => onChange({ ...config, environment: v as "live" | "test" })}
            >
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
        </div>
      )}

      {!config.generate && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm text-amber-400">
            You can generate API keys later from the client&apos;s API Keys tab.
          </p>
        </div>
      )}
    </div>
  );
}

// Step 3: Pricing Configuration
function PricingStep({
  config,
  onChange,
}: {
  config: PricingConfig;
  onChange: (config: PricingConfig) => void;
}) {
  const addTier = () => {
    const lastTier = config.tiers[config.tiers.length - 1];
    const newMinVolume = lastTier ? (lastTier.maxVolume ?? lastTier.minVolume) + 1 : 0;
    onChange({
      ...config,
      tiers: [
        ...config.tiers,
        {
          tierName: `Tier ${config.tiers.length + 1}`,
          minVolume: newMinVolume,
          maxVolume: null,
          pricePerUnit: lastTier ? (parseFloat(lastTier.pricePerUnit) * 0.9).toFixed(2) : "5.00",
        },
      ],
    });
  };

  const updateTier = (index: number, field: keyof PricingTier, value: unknown) => {
    const newTiers = [...config.tiers];
    newTiers[index] = { ...newTiers[index], [field]: value };
    onChange({ ...config, tiers: newTiers });
  };

  const removeTier = (index: number) => {
    onChange({
      ...config,
      tiers: config.tiers.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-slate-400">
        <DollarSign className="h-5 w-5" />
        <span className="text-sm font-medium">Pricing Configuration</span>
      </div>

      {/* Allow Overdraft */}
      <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
        <div className="flex items-start gap-4">
          <input
            type="checkbox"
            id="allowOverdraft"
            checked={config.allowOverdraft}
            onChange={(e) => onChange({ ...config, allowOverdraft: e.target.checked })}
            className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500"
          />
          <div className="flex-1">
            <Label htmlFor="allowOverdraft" className="text-white cursor-pointer">
              Allow Overdraft (Recommended)
            </Label>
            <p className="mt-1 text-sm text-slate-400">
              Allow the client to continue creating KYC sessions even with zero or negative balance.
              This will be reconciled at the end of the billing cycle.
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Tiers */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-slate-200">Pricing Tiers</Label>
            <p className="text-xs text-slate-500 mt-1">
              Configure volume-based pricing for TrueIdentity KYC sessions.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addTier}
            className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
          >
            <Plus className="mr-1.5 h-3 w-3" />
            Add Tier
          </Button>
        </div>

        {config.tiers.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center">
            <DollarSign className="mx-auto mb-4 h-12 w-12 text-slate-600" />
            <p className="text-sm text-slate-400 mb-4">
              No pricing tiers configured. Add tiers to set volume-based pricing.
            </p>
            <Button
              type="button"
              variant="outline"
              onClick={addTier}
              className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add First Tier
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-3">
              <p className="text-xs text-slate-500">
                Pricing is applied based on monthly volume. Set min/max volume ranges and price per KYC session.
                Leave Max Volume empty for unlimited.
              </p>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Tier Name</TableHead>
                  <TableHead className="text-slate-400">Min Volume</TableHead>
                  <TableHead className="text-slate-400">Max Volume</TableHead>
                  <TableHead className="text-slate-400">Price per KYC (MYR)</TableHead>
                  <TableHead className="text-right text-slate-400 w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {config.tiers.map((tier, index) => (
                  <TableRow key={index} className="border-slate-800">
                    <TableCell>
                      <Input
                        value={tier.tierName}
                        onChange={(e) => updateTier(index, "tierName", e.target.value)}
                        className="h-8 w-32 border-slate-700 bg-slate-800 text-white"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={tier.minVolume}
                        onChange={(e) => updateTier(index, "minVolume", parseInt(e.target.value) || 0)}
                        className="h-8 w-24 border-slate-700 bg-slate-800 text-white"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={tier.minVolume}
                        value={tier.maxVolume ?? ""}
                        placeholder="Unlimited"
                        onChange={(e) => updateTier(index, "maxVolume", e.target.value ? parseInt(e.target.value) : null)}
                        className="h-8 w-24 border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min={0}
                        value={tier.pricePerUnit}
                        onChange={(e) => updateTier(index, "pricePerUnit", e.target.value)}
                        className="h-8 w-24 border-slate-700 bg-slate-800 text-white"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeTier(index)}
                        disabled={config.tiers.length === 1}
                        className="h-8 w-8 text-red-400 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-30"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
              <h4 className="text-sm font-medium text-white mb-2">Example Pricing Calculation</h4>
              <p className="text-xs text-slate-400">
                If a client uses 150 KYC sessions in a month with tiers: 0-100 @ RM5, 101-500 @ RM4.50
                <br />
                Total: (100 × RM5) + (50 × RM4.50) = RM500 + RM225 = RM725
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Step 4: Credits Configuration
function CreditsStep({
  config,
  onChange,
}: {
  config: CreditsConfig;
  onChange: (config: CreditsConfig) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-slate-400">
        <CreditCard className="h-5 w-5" />
        <span className="text-sm font-medium">Initial Credits</span>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="creditAmount" className="text-slate-200">
            Credit Amount
          </Label>
          <Input
            id="creditAmount"
            type="number"
            placeholder="0"
            min="0"
            value={config.amount}
            onChange={(e) => onChange({ ...config, amount: e.target.value })}
            className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
          />
          <p className="text-xs text-slate-500">
            Leave empty or 0 to skip adding initial credits.
          </p>
        </div>

        {config.amount && parseInt(config.amount) > 0 && (
          <div className="space-y-2">
            <Label htmlFor="creditType" className="text-slate-200">
              Credit Type
            </Label>
            <Select
              value={config.type}
              onValueChange={(v) => onChange({ ...config, type: v as "included" | "topup" })}
            >
              <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-slate-700 bg-slate-800">
                <SelectItem value="included" className="text-white focus:bg-slate-700 focus:text-white">
                  Included (complimentary credits)
                </SelectItem>
                <SelectItem value="topup" className="text-white focus:bg-slate-700 focus:text-white">
                  Top Up (paid credits)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {config.amount && parseInt(config.amount) > 0 && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Initial Balance</span>
            <span className="text-xl font-semibold text-green-400">
              +{parseInt(config.amount).toLocaleString()}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Step 5: Review
function ReviewStep({
  formData,
  apiKeyConfig,
  pricingConfig,
  creditsConfig,
}: {
  formData: {
    name: string;
    code: string;
    contactEmail: string;
    contactPhone: string;
    companyRegistration: string;
    notes: string;
  };
  apiKeyConfig: ApiKeyConfig;
  pricingConfig: PricingConfig;
  creditsConfig: CreditsConfig;
}) {
  const creditAmount = creditsConfig.amount ? parseInt(creditsConfig.amount) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-slate-400">
        <CheckCircle2 className="h-5 w-5" />
        <span className="text-sm font-medium">Review & Confirm</span>
      </div>

      <div className="space-y-4">
        {/* Client Details */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
            <Building2 className="h-4 w-4 text-slate-400" />
            Client Details
          </h4>
          <div className="grid gap-3 text-sm md:grid-cols-2">
            <div>
              <span className="text-slate-400">Company Name:</span>
              <span className="ml-2 text-white">{formData.name}</span>
            </div>
            <div>
              <span className="text-slate-400">Code:</span>
              <code className="ml-2 rounded bg-slate-700 px-1.5 py-0.5 font-mono text-white">
                {formData.code}
              </code>
            </div>
            <div>
              <span className="text-slate-400">Email:</span>
              <span className="ml-2 text-white">{formData.contactEmail}</span>
            </div>
            <div>
              <span className="text-slate-400">Phone:</span>
              <span className="ml-2 text-white">{formData.contactPhone}</span>
            </div>
            <div>
              <span className="text-slate-400">SSM:</span>
              <span className="ml-2 text-white">{formData.companyRegistration}</span>
            </div>
            {formData.notes && (
              <div className="md:col-span-2">
                <span className="text-slate-400">Notes:</span>
                <span className="ml-2 text-white">{formData.notes}</span>
              </div>
            )}
          </div>
        </div>

        {/* API Key */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
            <Key className="h-4 w-4 text-slate-400" />
            API Key
          </h4>
          {apiKeyConfig.generate ? (
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <span className="text-slate-400">Product:</span>
                <span className="ml-2 text-white">TrueIdentity</span>
              </div>
              <div>
                <span className="text-slate-400">Environment:</span>
                <span
                  className={`ml-2 capitalize ${
                    apiKeyConfig.environment === "live" ? "text-green-400" : "text-amber-400"
                  }`}
                >
                  {apiKeyConfig.environment}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No API key will be generated</p>
          )}
        </div>

        {/* Pricing */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
            <DollarSign className="h-4 w-4 text-slate-400" />
            Pricing
          </h4>
          <div className="space-y-2 text-sm">
            <div>
              <span className="text-slate-400">Allow Overdraft:</span>
              <span className={`ml-2 ${pricingConfig.allowOverdraft ? "text-green-400" : "text-red-400"}`}>
                {pricingConfig.allowOverdraft ? "Yes" : "No"}
              </span>
            </div>
            <div>
              <span className="text-slate-400">Pricing Tiers:</span>
              <span className="ml-2 text-white">{pricingConfig.tiers.length} tier(s)</span>
            </div>
            {pricingConfig.tiers.length > 0 && (
              <div className="mt-2 text-xs text-slate-500">
                {pricingConfig.tiers.map((tier, i) => (
                  <div key={i}>
                    {tier.tierName}: {tier.minVolume}-{tier.maxVolume ?? "∞"} @ RM{tier.pricePerUnit}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Credits */}
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-medium text-white">
            <CreditCard className="h-4 w-4 text-slate-400" />
            Initial Credits
          </h4>
          {creditAmount > 0 ? (
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <span className="text-slate-400">Amount:</span>
                <span className="ml-2 text-green-400">+{creditAmount.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400">Type:</span>
                <span className="ml-2 capitalize text-white">{creditsConfig.type}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400">No initial credits</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Step 5: Success
function SuccessStep({
  result,
  copied,
  onCopy,
}: {
  result: CreationResult | null;
  copied: boolean;
  onCopy: () => void;
}) {
  if (!result) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center justify-center py-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20">
          <CheckCircle2 className="h-8 w-8 text-green-400" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-white">{result.client.name}</h3>
        <code className="mt-1 rounded bg-slate-800 px-2 py-1 font-mono text-sm text-slate-300">
          {result.client.code}
        </code>
      </div>

      {result.apiKey && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <div className="mb-2 flex items-center gap-2">
            <Key className="h-4 w-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">
              API Key Generated - Save it now!
            </span>
          </div>
          <p className="mb-3 text-xs text-amber-300/80">
            This is the only time the full API key will be shown. Copy and store it securely.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded bg-slate-800 p-3 font-mono text-sm text-white">
              {result.apiKey.key}
            </code>
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={onCopy}
              className="shrink-0 border-slate-700 bg-slate-800 hover:bg-slate-700"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4 text-slate-400" />
              )}
            </Button>
          </div>
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
            <span>Product: TrueIdentity</span>
            <span>•</span>
            <span className="capitalize">Environment: {result.apiKey.environment}</span>
          </div>
        </div>
      )}

      {!result.apiKey && (
        <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 text-center">
          <p className="text-sm text-slate-400">
            No API key was generated. You can create one from the client&apos;s API Keys tab.
          </p>
        </div>
      )}
    </div>
  );
}
