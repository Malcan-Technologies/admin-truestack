"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Key,
  CreditCard,
  Play,
  RefreshCw,
  ExternalLink,
  Copy,
  Eye,
  EyeOff,
  CheckCircle,
  XCircle,
  Clock,
  Webhook,
  Plus,
  FileCheck,
  User,
  DollarSign,
  Settings,
  CloudDownload,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { apiClient } from "@/lib/utils";

type CreditEntry = {
  id: string;
  amount: number;
  balance_after: number;
  type: string;
  reference_id: string | null;
  description: string | null;
  created_at: string;
};

type DemoSetupData = {
  isNew: boolean;
  client: {
    id: string;
    name: string;
    code: string;
    status: string;
    createdAt: string;
  };
  apiKey: {
    id: string;
    key: string;
    displayKey: string;
    environment: string;
    status: string;
  } | null;
  creditBalance: number;
  allowOverdraft: boolean;
  pricingTiers: {
    id: string;
    tier_name: string;
    min_volume: number;
    max_volume: number | null;
    credits_per_session: number; // 10 credits = RM 1
  }[];
  recentSessions: {
    id: string;
    ref_id: string;
    status: string;
    result: string | null;
    document_name: string;
    document_number: string;
    created_at: string;
    updated_at: string;
  }[];
  creditLedger: CreditEntry[];
};

type KycSession = {
  id: string;
  onboarding_url: string;
  expires_at: string;
  status: string;
};

type WebhookData = {
  session: {
    id: string;
    ref_id: string;
    status: string;
    result: string | null;
    reject_message: string | null;
    document_name: string;
    document_number: string;
    innovatif_response: Record<string, unknown> | null;
    s3_front_document: string | null;
    s3_back_document: string | null;
    s3_face_image: string | null;
    s3_best_frame: string | null;
    webhook_delivered: boolean;
    webhook_delivered_at: string | null;
    created_at: string;
    updated_at: string;
  } | null;
  webhooks: {
    id: string;
    session_id: string;
    event: string;
    payload: Record<string, unknown>;
    received_at: string;
  }[];
};

const DOCUMENT_TYPES = [
  { value: "1", label: "MyKad" },
  { value: "2", label: "MyTentera" },
  { value: "3", label: "Passport" },
  { value: "4", label: "MyKid" },
  { value: "5", label: "MyPR" },
  { value: "6", label: "MyKas" },
];

const STORAGE_KEY = "demo_trueidentity_session";

export default function TrueIdentityDemoPage() {
  const [loading, setLoading] = useState(true);
  const [demoData, setDemoData] = useState<DemoSetupData | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  // KYC Form state
  const [documentName, setDocumentName] = useState("JOHN DOE BIN AHMAD");
  const [documentNumber, setDocumentNumber] = useState("900101145566");
  const [documentType, setDocumentType] = useState("1");
  const [creatingSession, setCreatingSession] = useState(false);
  const [currentSession, setCurrentSession] = useState<KycSession | null>(null);

  // Webhook/Status state
  const [webhookData, setWebhookData] = useState<WebhookData | null>(null);
  const [pollingSession, setPollingSession] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Credit top-up state
  const [topupAmount, setTopupAmount] = useState("10");
  const [toppingUp, setToppingUp] = useState(false);

  // Innovatif refresh state - matches the clean API response format
  const [refreshingFromInnovatif, setRefreshingFromInnovatif] = useState(false);
  const [innovatifStatus, setInnovatifStatus] = useState<{
    // Session identification
    id: string;
    ref_id?: string;
    
    // Status
    status: string;
    result: string | null;
    reject_message?: string | null;
    refreshed: boolean;
    error?: string;
    message?: string;
    
    // Document data extracted from OCR
    document?: {
      full_name?: string;
      id_number?: string;
      id_number_back?: string;
      address?: string;
      gender?: string;
    } | null;
    
    // Verification results
    verification?: {
      document_valid?: boolean;
      name_match?: boolean;
      id_match?: boolean;
      front_back_match?: boolean;
      landmark_valid?: boolean;
      face_match?: boolean;
      face_match_score?: number | null;
      liveness_passed?: boolean;
    };
    
    // Document images (S3 URLs)
    images?: {
      front_document?: string | null;
      back_document?: string | null;
      face_image?: string | null;
      best_frame?: string | null;
    };
    
    // Raw provider data
    _raw?: Record<string, unknown>;
  } | null>(null);

  // Load persisted session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as KycSession;
        setCurrentSession(parsed);
      }
    } catch (e) {
      console.error("Failed to load persisted session:", e);
    }
  }, []);

  // Persist current session to localStorage when it changes
  useEffect(() => {
    if (currentSession) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(currentSession));
    }
  }, [currentSession]);

  const fetchDemoSetup = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient<DemoSetupData>("/api/admin/demo/setup");
      setDemoData(data);
      if (data.isNew) {
        toast.success("Demo client created successfully!");
      }
      
      // If no current session but there are recent pending/processing sessions, load the most recent
      if (!currentSession && data.recentSessions?.length > 0) {
        const pendingSession = data.recentSessions.find(
          (s) => s.status === "pending" || s.status === "processing"
        );
        if (pendingSession) {
          setCurrentSession({
            id: pendingSession.id,
            onboarding_url: "", // Will be fetched from webhook data
            expires_at: "",
            status: pendingSession.status,
          });
        }
      }
    } catch (error) {
      toast.error("Failed to load demo setup");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [currentSession]);

  useEffect(() => {
    fetchDemoSetup();
  }, [fetchDemoSetup]);

  const copyApiKey = async () => {
    if (demoData?.apiKey?.key) {
      await navigator.clipboard.writeText(demoData.apiKey.key);
      toast.success("API key copied to clipboard");
    }
  };

  const regenerateApiKey = async () => {
    try {
      const result = await apiClient<{ apiKey: DemoSetupData["apiKey"] }>("/api/admin/demo/setup", {
        method: "POST",
      });
      if (result.apiKey && demoData) {
        setDemoData({ ...demoData, apiKey: result.apiKey });
        toast.success("New API key generated");
      }
    } catch (error) {
      toast.error("Failed to regenerate API key");
    }
  };

  const createKycSession = async () => {
    if (!demoData?.apiKey?.key) {
      toast.error("No API key available");
      return;
    }

    if (!documentName || !documentNumber) {
      toast.error("Please fill in document name and number");
      return;
    }

    setCreatingSession(true);
    try {
      // Call the public KYC API using the demo client's API key
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      // Demo webhook URL - this is where we receive the webhook for display in the demo
      const demoWebhookUrl = `${apiUrl}/api/demo/webhook`;
      
      const response = await fetch(`${apiUrl}/api/v1/kyc/sessions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${demoData.apiKey.key}`,
        },
        body: JSON.stringify({
          document_name: documentName,
          document_number: documentNumber.replace(/-/g, ""),
          document_type: documentType,
          webhook_url: demoWebhookUrl,
          metadata: { demo: true },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      const session = await response.json();
      setCurrentSession(session);

      // Update credit balance
      if (demoData) {
        setDemoData({ ...demoData, creditBalance: demoData.creditBalance - 1 });
      }

      toast.success("KYC session created successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create KYC session");
    } finally {
      setCreatingSession(false);
    }
  };

  const openKycUrl = () => {
    if (currentSession?.onboarding_url) {
      window.open(currentSession.onboarding_url, "_blank");
    }
  };

  const pollSessionStatus = useCallback(async (showToast = false) => {
    if (!currentSession?.id) return;

    setPollingSession(true);
    try {
      const data = await apiClient<WebhookData>(`/api/demo/webhook/${currentSession.id}`);
      setWebhookData(data);
      setLastRefresh(new Date());
      
      // Update current session status from the fetched data
      if (data.session && data.session.status !== currentSession.status) {
        setCurrentSession((prev) => prev ? { ...prev, status: data.session!.status } : prev);
      }
      
      if (showToast) {
        toast.success("Session status refreshed");
      }
    } catch (error) {
      console.error("Failed to poll session status:", error);
      if (showToast) {
        toast.error("Failed to refresh session status");
      }
    } finally {
      setPollingSession(false);
    }
  }, [currentSession?.id, currentSession?.status]);

  // Manual refresh function
  const manualRefresh = useCallback(() => {
    pollSessionStatus(true);
  }, [pollSessionStatus]);

  // Clear current session and start new
  const clearSession = useCallback(() => {
    setCurrentSession(null);
    setWebhookData(null);
    setInnovatifStatus(null);
    localStorage.removeItem(STORAGE_KEY);
    toast.success("Session cleared - ready for new session");
  }, []);

  // Start a completely new session (clear and reset form)
  const startNewSession = useCallback(() => {
    setCurrentSession(null);
    setWebhookData(null);
    setInnovatifStatus(null);
    localStorage.removeItem(STORAGE_KEY);
    // Generate new random document number for testing
    const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    setDocumentNumber(`90010114${randomSuffix}`);
    toast.success("Ready for new session");
  }, []);

  // Refresh status directly from Innovatif API (simulating what a client would do)
  const refreshFromInnovatif = useCallback(async () => {
    if (!currentSession?.id || !demoData?.apiKey?.key) {
      toast.error("No active session or API key");
      return;
    }

    setRefreshingFromInnovatif(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      
      // Call POST /v1/kyc/sessions/:id to refresh from Innovatif
      const response = await fetch(`${apiUrl}/api/v1/kyc/sessions/${currentSession.id}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${demoData.apiKey.key}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      setInnovatifStatus(result);
      
      // Update current session status if it changed
      if (result.status && result.status !== currentSession.status) {
        setCurrentSession((prev) => prev ? { ...prev, status: result.status } : prev);
      }

      if (result.refreshed) {
        toast.success(`Status refreshed from Innovatif: ${result.status}`);
        // Also refresh our local webhook data
        await pollSessionStatus();
      } else if (result.error) {
        toast.error(result.error);
      } else {
        toast.info(result.message || "Session already finalized");
      }
    } catch (error) {
      console.error("Failed to refresh from Innovatif:", error);
      toast.error(error instanceof Error ? error.message : "Failed to refresh from Innovatif");
    } finally {
      setRefreshingFromInnovatif(false);
    }
  }, [currentSession?.id, currentSession?.status, demoData?.apiKey?.key, pollSessionStatus]);

  useEffect(() => {
    if (currentSession?.id) {
      // Poll immediately
      pollSessionStatus();

      // Then poll every 5 seconds while session is pending/processing
      const shouldPoll = !webhookData?.session || 
        webhookData.session.status === "pending" || 
        webhookData.session.status === "processing";
      
      if (shouldPoll) {
        const interval = setInterval(() => pollSessionStatus(), 5000);
        return () => clearInterval(interval);
      }
    }
  }, [currentSession?.id, pollSessionStatus, webhookData?.session?.status]);

  const topUpCredits = async () => {
    if (!demoData?.client?.id) return;

    const amount = parseInt(topupAmount);
    if (isNaN(amount) || amount < 1) {
      toast.error("Please enter a valid amount");
      return;
    }

    setToppingUp(true);
    try {
      await apiClient(`/api/admin/clients/${demoData.client.id}/credits`, {
        method: "POST",
        body: JSON.stringify({
          amount,
          type: "topup",
          description: "Demo credit top-up",
        }),
      });

      // Refresh demo data
      await fetchDemoSetup();
      toast.success(`Added ${amount} credits`);
    } catch (error) {
      toast.error("Failed to add credits");
    } finally {
      setToppingUp(false);
    }
  };

  const getStatusIcon = (status: string, result: string | null) => {
    if (status === "completed") {
      if (result === "approved") {
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      } else {
        return <XCircle className="h-5 w-5 text-red-400" />;
      }
    }
    return <Clock className="h-5 w-5 text-amber-400" />;
  };

  const getStatusBadge = (status: string, result: string | null) => {
    if (status === "completed") {
      return result === "approved" ? (
        <Badge className="border-green-500/30 bg-green-500/10 text-green-400">Approved</Badge>
      ) : (
        <Badge className="border-red-500/30 bg-red-500/10 text-red-400">Rejected</Badge>
      );
    }
    if (status === "pending") {
      return <Badge className="border-amber-500/30 bg-amber-500/10 text-amber-400">Pending</Badge>;
    }
    if (status === "processing") {
      return <Badge className="border-blue-500/30 bg-blue-500/10 text-blue-400">Processing</Badge>;
    }
    return <Badge className="border-slate-500/30 bg-slate-500/10 text-slate-400">{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-400">Loading demo environment...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
            TrueIdentity Demo
          </span>
        </h1>
        <p className="mt-2 text-slate-400">
          Test the complete KYC flow with a demo client. This simulates how your clients will integrate with TrueIdentity.
        </p>
      </div>

      {/* Demo Client Setup - Row 1 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Client Info Card */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <User className="h-5 w-5" />
              Demo Client
            </CardTitle>
            <CardDescription className="text-slate-400">
              {demoData?.client.code}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Status</span>
              <Badge className="border-green-500/30 bg-green-500/10 text-green-400">
                {demoData?.client.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Created</span>
              <span className="text-sm text-white">
                {demoData?.client.createdAt ? new Date(demoData.client.createdAt).toLocaleDateString() : "-"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* API Key Card */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <Key className="h-5 w-5" />
              API Key
            </CardTitle>
            <CardDescription className="text-slate-400">
              Use this key to authenticate API requests
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {demoData?.apiKey ? (
              <>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-slate-800 px-3 py-2 font-mono text-xs text-slate-300 overflow-hidden">
                    {showApiKey ? demoData.apiKey.key : demoData.apiKey.displayKey}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="h-8 w-8 text-slate-400 hover:text-white"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={copyApiKey}
                    className="h-8 w-8 text-slate-400 hover:text-white"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={regenerateApiKey}
                  className="w-full border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Regenerate Key
                </Button>
              </>
            ) : (
              <p className="text-sm text-slate-400">No API key available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Credits & Pricing - Row 2 */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Credits Card */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-white">
              <CreditCard className="h-5 w-5" />
              Credits
            </CardTitle>
            <CardDescription className="text-slate-400">
              Each KYC session costs 1 credit
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <span className="text-4xl font-bold text-white">{demoData?.creditBalance || 0}</span>
              <p className="text-sm text-slate-400">credits remaining</p>
              <p className="text-xs text-slate-500">(RM {((demoData?.creditBalance || 0) / 10).toFixed(2)})</p>
            </div>
            <div className="flex gap-2">
              <Input
                type="number"
                min="1"
                value={topupAmount}
                onChange={(e) => setTopupAmount(e.target.value)}
                className="h-9 border-slate-700 bg-slate-800 text-white"
              />
              <Button
                size="sm"
                onClick={topUpCredits}
                disabled={toppingUp}
                className="bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600"
              >
                <Plus className="mr-1 h-4 w-4" />
                {toppingUp ? "..." : "Add"}
              </Button>
            </div>
            
            {/* Allow Overdraft Toggle */}
            <div className="border-t border-slate-700 pt-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Allow Overdraft</p>
                  <p className="text-xs text-slate-400">Continue even with zero balance</p>
                </div>
                <Badge 
                  variant="outline" 
                  className={demoData?.allowOverdraft 
                    ? "border-green-500/30 bg-green-500/10 text-green-400" 
                    : "border-red-500/30 bg-red-500/10 text-red-400"
                  }
                >
                  {demoData?.allowOverdraft ? "Enabled" : "Disabled"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Tiers Card */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-white">
                <DollarSign className="h-5 w-5" />
                Pricing Tiers
              </CardTitle>
              <CardDescription className="text-slate-400">
                Volume-based pricing
              </CardDescription>
            </div>
            {demoData?.client?.id && (
              <Link href={`/clients/${demoData.client.id}`}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-white"
                  title="Manage Pricing"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {demoData?.pricingTiers && demoData.pricingTiers.length > 0 ? (
              <div className="space-y-2">
                {demoData.pricingTiers.map((tier) => (
                  <div key={tier.id} className="flex items-center justify-between rounded-lg bg-slate-800/50 px-3 py-2">
                    <div>
                      <span className="text-sm font-medium text-white">{tier.tier_name}</span>
                      <span className="ml-2 text-xs text-slate-400">
                        ({tier.min_volume} - {tier.max_volume !== null ? tier.max_volume : "∞"})
                      </span>
                    </div>
                    <span className="font-mono text-sm text-green-400">
                      {tier.credits_per_session} credits (RM {(tier.credits_per_session / 10).toFixed(2)})
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-4 text-center">
                <p className="text-sm text-slate-400 mb-2">No pricing tiers configured</p>
                {demoData?.client?.id && (
                  <Link href={`/clients/${demoData.client.id}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Tiers
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Demo Section */}
      <Tabs defaultValue="create" className="space-y-6">
        <TabsList className="border-slate-800 bg-slate-900">
          <TabsTrigger
            value="create"
            className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400"
          >
            <FileCheck className="mr-2 h-4 w-4" />
            Create KYC Session
          </TabsTrigger>
          <TabsTrigger
            value="status"
            className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400"
          >
            <Clock className="mr-2 h-4 w-4" />
            Session Status
          </TabsTrigger>
          <TabsTrigger
            value="webhook"
            className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400"
          >
            <Webhook className="mr-2 h-4 w-4" />
            Webhook Log
          </TabsTrigger>
          <TabsTrigger
            value="billing"
            className="data-[state=active]:bg-indigo-500/20 data-[state=active]:text-indigo-400"
          >
            <DollarSign className="mr-2 h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        {/* Create KYC Session Tab */}
        <TabsContent value="create">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Form */}
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white">Create KYC Session</CardTitle>
                <CardDescription className="text-slate-400">
                  Enter the document holder&apos;s information to create a new KYC verification session.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="documentName" className="text-slate-200">
                    Full Name (as per ID)
                  </Label>
                  <Input
                    id="documentName"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                    placeholder="JOHN DOE BIN AHMAD"
                    className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="documentNumber" className="text-slate-200">
                    Document Number
                  </Label>
                  <Input
                    id="documentNumber"
                    value={documentNumber}
                    onChange={(e) => setDocumentNumber(e.target.value)}
                    placeholder="900101145566"
                    className="border-slate-700 bg-slate-800 text-white placeholder:text-slate-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="documentType" className="text-slate-200">
                    Document Type
                  </Label>
                  <Select value={documentType} onValueChange={setDocumentType}>
                    <SelectTrigger className="border-slate-700 bg-slate-800 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-slate-700 bg-slate-800">
                      {DOCUMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="text-white hover:bg-slate-700">
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={createKycSession}
                  disabled={creatingSession || !demoData?.apiKey || demoData.creditBalance < 1}
                  className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600"
                >
                  {creatingSession ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Create Session
                    </>
                  )}
                </Button>

                {demoData && demoData.creditBalance < 1 && (
                  <p className="text-center text-sm text-red-400">
                    Insufficient credits. Please top up to create sessions.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Session Result */}
            <Card className="border-slate-800 bg-slate-900/50">
              <CardHeader>
                <CardTitle className="text-white">Session Result</CardTitle>
                <CardDescription className="text-slate-400">
                  {currentSession ? "Session created successfully" : "Create a session to see the result"}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentSession ? (
                  <div className="space-y-4">
                    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-3">
                      <div>
                        <span className="text-xs text-slate-500">Session ID</span>
                        <p className="font-mono text-sm text-white">{currentSession.id}</p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">Status</span>
                        <p className="text-sm">
                          {getStatusBadge(currentSession.status, null)}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-slate-500">Expires</span>
                        <p className="text-sm text-white">
                          {new Date(currentSession.expires_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-200">Onboarding URL</Label>
                      <div className="flex gap-2">
                        <Input
                          value={currentSession.onboarding_url}
                          readOnly
                          className="border-slate-700 bg-slate-800 text-white text-xs"
                        />
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(currentSession.onboarding_url);
                            toast.success("URL copied");
                          }}
                          className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={openKycUrl}
                        className="flex-1 bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600"
                      >
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Open KYC URL
                      </Button>
                      <Button
                        variant="outline"
                        onClick={startNewSession}
                        className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        New
                      </Button>
                    </div>

                    <p className="text-center text-xs text-slate-500">
                      Complete the KYC process in the opened window. Results will appear in the Status and Webhook tabs.
                    </p>

                    {/* Local development note */}
                    {/* <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 mt-4">
                      <p className="text-xs text-amber-400">
                        <strong>Note:</strong> Webhooks from Innovatif cannot reach localhost. 
                        Session status updates will only work in production. 
                        The redirect page shows the final status from query parameters.
                      </p>
                    </div> */}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileCheck className="h-12 w-12 text-slate-600 mb-4" />
                    <p className="text-slate-400">No active session</p>
                    <p className="text-sm text-slate-500">
                      Create a session to start the KYC process
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Session Status Tab */}
        <TabsContent value="status">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white">Session Status</CardTitle>
                <CardDescription className="text-slate-400">
                  {currentSession ? (
                    <>
                      Tracking session {currentSession.id.substring(0, 8)}...
                      {lastRefresh && (
                        <span className="ml-2 text-xs">
                          (Last updated: {lastRefresh.toLocaleTimeString()})
                        </span>
                      )}
                    </>
                  ) : (
                    "No active session"
                  )}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {currentSession && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={refreshFromInnovatif}
                      disabled={refreshingFromInnovatif}
                      className="border-indigo-500/50 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200"
                    >
                      <CloudDownload className={`mr-2 h-4 w-4 ${refreshingFromInnovatif ? "animate-pulse" : ""}`} />
                      {refreshingFromInnovatif ? "Fetching..." : "Fetch from Innovatif"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={manualRefresh}
                      disabled={pollingSession}
                      className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${pollingSession ? "animate-spin" : ""}`} />
                      Refresh DB
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSession}
                      className="text-slate-400 hover:text-red-400 hover:bg-red-500/10"
                    >
                      Clear
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {webhookData?.session ? (
                <div className="space-y-6">
                  {/* Status Overview */}
                  <div className="flex items-center gap-4 p-4 rounded-lg border border-slate-700 bg-slate-800/50">
                    {getStatusIcon(webhookData.session.status, webhookData.session.result)}
                    <div>
                      <h3 className="text-lg font-semibold text-white">
                        {webhookData.session.status === "completed"
                          ? webhookData.session.result === "approved"
                            ? "Verification Approved"
                            : "Verification Rejected"
                          : webhookData.session.status === "pending"
                          ? "Waiting for User"
                          : "Processing"}
                      </h3>
                      {webhookData.session.reject_message && (
                        <p className="text-sm text-red-400">{webhookData.session.reject_message}</p>
                      )}
                    </div>
                    {getStatusBadge(webhookData.session.status, webhookData.session.result)}
                  </div>

                  {/* TrueStack API Response (what clients receive) */}
                  {innovatifStatus && (
                    <div className="space-y-4">
                      {/* Document Data */}
                      {innovatifStatus.document && (
                        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
                          <h4 className="text-sm font-medium text-green-300 mb-3 flex items-center gap-2">
                            <FileCheck className="h-4 w-4" />
                            Document Data
                          </h4>
                          <div className="grid gap-4 md:grid-cols-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-400">full_name</span>
                              <span className="text-white">{innovatifStatus.document.full_name || "-"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">id_number</span>
                              <span className="text-white font-mono">{innovatifStatus.document.id_number || "-"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">gender</span>
                              <span className="text-white">{innovatifStatus.document.gender || "-"}</span>
                            </div>
                            <div className="flex justify-between col-span-2">
                              <span className="text-slate-400">address</span>
                              <span className="text-white text-xs text-right max-w-[350px]">{innovatifStatus.document.address || "-"}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Verification Results */}
                      {innovatifStatus.verification && (
                        <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
                          <h4 className="text-sm font-medium text-blue-300 mb-3 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Verification Results
                          </h4>
                          <div className="grid gap-3 md:grid-cols-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-400">document_valid</span>
                              <span className={innovatifStatus.verification.document_valid ? "text-green-400" : "text-red-400"}>
                                {innovatifStatus.verification.document_valid ? "true" : "false"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">name_match</span>
                              <span className={innovatifStatus.verification.name_match ? "text-green-400" : "text-red-400"}>
                                {innovatifStatus.verification.name_match ? "true" : "false"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">id_match</span>
                              <span className={innovatifStatus.verification.id_match ? "text-green-400" : "text-red-400"}>
                                {innovatifStatus.verification.id_match ? "true" : "false"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">front_back_match</span>
                              <span className={innovatifStatus.verification.front_back_match ? "text-green-400" : "text-red-400"}>
                                {innovatifStatus.verification.front_back_match ? "true" : "false"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">landmark_valid</span>
                              <span className={innovatifStatus.verification.landmark_valid ? "text-green-400" : "text-red-400"}>
                                {innovatifStatus.verification.landmark_valid ? "true" : "false"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">face_match</span>
                              <span className={innovatifStatus.verification.face_match ? "text-green-400" : "text-red-400"}>
                                {innovatifStatus.verification.face_match ? "true" : "false"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">face_match_score</span>
                              <span className="text-white font-mono">{innovatifStatus.verification.face_match_score ?? "-"}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">liveness_passed</span>
                              <span className={innovatifStatus.verification.liveness_passed ? "text-green-400" : "text-red-400"}>
                                {innovatifStatus.verification.liveness_passed ? "true" : "false"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Document Images (S3 URLs) */}
                      {innovatifStatus.images && (
                        <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4">
                          <h4 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Document Images
                          </h4>
                          <div className="grid gap-4 md:grid-cols-2 text-sm">
                            <div className="space-y-1">
                              <span className="text-slate-400">front_document</span>
                              {innovatifStatus.images.front_document ? (
                                <a href={innovatifStatus.images.front_document} target="_blank" rel="noopener noreferrer"
                                  className="block text-xs text-blue-400 hover:text-blue-300 truncate">
                                  {innovatifStatus.images.front_document}
                                </a>
                              ) : <span className="text-slate-500">null</span>}
                            </div>
                            <div className="space-y-1">
                              <span className="text-slate-400">back_document</span>
                              {innovatifStatus.images.back_document ? (
                                <a href={innovatifStatus.images.back_document} target="_blank" rel="noopener noreferrer"
                                  className="block text-xs text-blue-400 hover:text-blue-300 truncate">
                                  {innovatifStatus.images.back_document}
                                </a>
                              ) : <span className="text-slate-500">null</span>}
                            </div>
                            <div className="space-y-1">
                              <span className="text-slate-400">face_image</span>
                              {innovatifStatus.images.face_image ? (
                                <a href={innovatifStatus.images.face_image} target="_blank" rel="noopener noreferrer"
                                  className="block text-xs text-blue-400 hover:text-blue-300 truncate">
                                  {innovatifStatus.images.face_image}
                                </a>
                              ) : <span className="text-slate-500">null</span>}
                            </div>
                            <div className="space-y-1">
                              <span className="text-slate-400">best_frame</span>
                              {innovatifStatus.images.best_frame ? (
                                <a href={innovatifStatus.images.best_frame} target="_blank" rel="noopener noreferrer"
                                  className="block text-xs text-blue-400 hover:text-blue-300 truncate">
                                  {innovatifStatus.images.best_frame}
                                </a>
                              ) : <span className="text-slate-500">null</span>}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Full JSON Response */}
                      <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-4">
                        <h4 className="text-sm font-medium text-indigo-300 mb-3 flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Full API Response (JSON)
                        </h4>
                        <p className="text-xs text-slate-400 mb-3">
                          Complete response from POST /v1/kyc/sessions/:id
                        </p>
                        <pre className="text-xs text-slate-300 overflow-auto max-h-64 p-3 rounded bg-slate-900 border border-slate-700">
                          {JSON.stringify(innovatifStatus, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-800/30 p-4">
                      <h4 className="text-sm font-medium text-slate-300">Document Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Name</span>
                          <span className="text-white">{webhookData.session.document_name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Number</span>
                          <span className="text-white font-mono">{webhookData.session.document_number}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 rounded-lg border border-slate-700 bg-slate-800/30 p-4">
                      <h4 className="text-sm font-medium text-slate-300">Webhook Status</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Delivered</span>
                          <span className={webhookData.session.webhook_delivered ? "text-green-400" : "text-amber-400"}>
                            {webhookData.session.webhook_delivered ? "Yes" : "Pending"}
                          </span>
                        </div>
                        {webhookData.session.webhook_delivered_at && (
                          <div className="flex justify-between">
                            <span className="text-slate-400">Delivered At</span>
                            <span className="text-white">
                              {new Date(webhookData.session.webhook_delivered_at).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Innovatif Response */}
                  {webhookData.session.innovatif_response && (
                    <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
                      <h4 className="text-sm font-medium text-slate-300 mb-3">OCR & Verification Data</h4>
                      <pre className="text-xs text-slate-400 overflow-auto max-h-64 p-3 rounded bg-slate-900">
                        {JSON.stringify(webhookData.session.innovatif_response, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ) : currentSession ? (
                <div className="space-y-6">
                  {/* Pending status message */}
                  <div className="flex flex-col items-center justify-center py-8 border border-slate-700 rounded-lg bg-slate-800/30">
                    <RefreshCw className="h-8 w-8 text-slate-600 animate-spin mb-4" />
                    <p className="text-slate-400">Waiting for KYC completion...</p>
                    <p className="text-sm text-slate-500 mb-4">Complete the verification in the KYC window</p>
                    <p className="text-xs text-slate-500">
                      Click &quot;Fetch from Innovatif&quot; to check current status if webhook is delayed
                    </p>
                  </div>

                  {/* Show Innovatif status if fetched manually */}
                  {innovatifStatus && (
                    <div className="space-y-4">
                      {/* Status from Innovatif */}
                      <div className="flex items-center gap-4 p-4 rounded-lg border border-slate-700 bg-slate-800/50">
                        {innovatifStatus.status === "completed" ? (
                          innovatifStatus.result === "approved" ? (
                            <CheckCircle className="h-8 w-8 text-green-500" />
                          ) : (
                            <XCircle className="h-8 w-8 text-red-500" />
                          )
                        ) : (
                          <Clock className="h-8 w-8 text-amber-500" />
                        )}
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {innovatifStatus.status === "completed"
                              ? innovatifStatus.result === "approved"
                                ? "Verification Approved"
                                : "Verification Rejected"
                              : innovatifStatus.status === "pending"
                              ? "Waiting for User"
                              : "Processing"}
                          </h3>
                          {innovatifStatus.reject_message && (
                            <p className="text-sm text-red-400">{innovatifStatus.reject_message}</p>
                          )}
                        </div>
                        <Badge variant="outline" className={
                          innovatifStatus.status === "completed"
                            ? innovatifStatus.result === "approved"
                              ? "border-green-500 text-green-500"
                              : "border-red-500 text-red-500"
                            : "border-amber-500 text-amber-500"
                        }>
                          {innovatifStatus.status}
                        </Badge>
                      </div>

                      {/* Document Data */}
                      {innovatifStatus.document && (
                        <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-4">
                          <h4 className="text-sm font-medium text-green-300 mb-3 flex items-center gap-2">
                            <FileCheck className="h-4 w-4" />
                            Document Data
                          </h4>
                          <div className="grid gap-4 md:grid-cols-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-400">full_name</span>
                              <span className="text-white">{innovatifStatus.document.full_name || "-"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">id_number</span>
                              <span className="text-white font-mono">{innovatifStatus.document.id_number || "-"}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">gender</span>
                              <span className="text-white">{innovatifStatus.document.gender || "-"}</span>
                            </div>
                            <div className="flex justify-between col-span-2">
                              <span className="text-slate-400">address</span>
                              <span className="text-white text-xs text-right max-w-[350px]">{innovatifStatus.document.address || "-"}</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Verification Results */}
                      {innovatifStatus.verification && (
                        <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-4">
                          <h4 className="text-sm font-medium text-blue-300 mb-3 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Verification Results
                          </h4>
                          <div className="grid gap-3 md:grid-cols-3 text-sm">
                            <div className="flex justify-between">
                              <span className="text-slate-400">document_valid</span>
                              <span className={innovatifStatus.verification.document_valid ? "text-green-400" : "text-red-400"}>
                                {innovatifStatus.verification.document_valid ? "true" : "false"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">name_match</span>
                              <span className={innovatifStatus.verification.name_match ? "text-green-400" : "text-red-400"}>
                                {innovatifStatus.verification.name_match ? "true" : "false"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">id_match</span>
                              <span className={innovatifStatus.verification.id_match ? "text-green-400" : "text-red-400"}>
                                {innovatifStatus.verification.id_match ? "true" : "false"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">face_match</span>
                              <span className={innovatifStatus.verification.face_match ? "text-green-400" : "text-red-400"}>
                                {innovatifStatus.verification.face_match ? "true" : "false"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">face_match_score</span>
                              <span className="text-white font-mono">{innovatifStatus.verification.face_match_score ?? "-"}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">liveness_passed</span>
                              <span className={innovatifStatus.verification.liveness_passed ? "text-green-400" : "text-red-400"}>
                                {innovatifStatus.verification.liveness_passed ? "true" : "false"}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Document Images (S3 URLs) */}
                      {innovatifStatus.images && (
                        <div className="rounded-lg border border-purple-500/30 bg-purple-500/5 p-4">
                          <h4 className="text-sm font-medium text-purple-300 mb-3 flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Document Images
                          </h4>
                          <div className="grid gap-4 md:grid-cols-2 text-sm">
                            <div className="space-y-1">
                              <span className="text-slate-400">front_document</span>
                              {innovatifStatus.images.front_document ? (
                                <a href={innovatifStatus.images.front_document} target="_blank" rel="noopener noreferrer"
                                  className="block text-xs text-blue-400 hover:text-blue-300 truncate">
                                  {innovatifStatus.images.front_document}
                                </a>
                              ) : <span className="text-slate-500">null</span>}
                            </div>
                            <div className="space-y-1">
                              <span className="text-slate-400">back_document</span>
                              {innovatifStatus.images.back_document ? (
                                <a href={innovatifStatus.images.back_document} target="_blank" rel="noopener noreferrer"
                                  className="block text-xs text-blue-400 hover:text-blue-300 truncate">
                                  {innovatifStatus.images.back_document}
                                </a>
                              ) : <span className="text-slate-500">null</span>}
                            </div>
                            <div className="space-y-1">
                              <span className="text-slate-400">face_image</span>
                              {innovatifStatus.images.face_image ? (
                                <a href={innovatifStatus.images.face_image} target="_blank" rel="noopener noreferrer"
                                  className="block text-xs text-blue-400 hover:text-blue-300 truncate">
                                  {innovatifStatus.images.face_image}
                                </a>
                              ) : <span className="text-slate-500">null</span>}
                            </div>
                            <div className="space-y-1">
                              <span className="text-slate-400">best_frame</span>
                              {innovatifStatus.images.best_frame ? (
                                <a href={innovatifStatus.images.best_frame} target="_blank" rel="noopener noreferrer"
                                  className="block text-xs text-blue-400 hover:text-blue-300 truncate">
                                  {innovatifStatus.images.best_frame}
                                </a>
                              ) : <span className="text-slate-500">null</span>}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Raw API Response */}
                      <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/5 p-4">
                        <h4 className="text-sm font-medium text-indigo-300 mb-3 flex items-center gap-2">
                          <Activity className="h-4 w-4" />
                          Client API Response (POST /v1/kyc/sessions/:id)
                        </h4>
                        <pre className="text-xs text-slate-300 overflow-auto max-h-48 p-3 rounded bg-slate-900 border border-slate-700">
                          {JSON.stringify(innovatifStatus, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Clock className="h-12 w-12 text-slate-600 mb-4" />
                  <p className="text-slate-400">No active session</p>
                  <p className="text-sm text-slate-500">Create a session first</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhook Log Tab */}
        <TabsContent value="webhook">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white">Webhook Log</CardTitle>
                <CardDescription className="text-slate-400">
                  Incoming webhooks received from our backend (simulating your webhook endpoint)
                  {lastRefresh && (
                    <span className="ml-2 text-xs">
                      (Last updated: {lastRefresh.toLocaleTimeString()})
                    </span>
                  )}
                </CardDescription>
              </div>
              {currentSession && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={manualRefresh}
                  disabled={pollingSession}
                  className="border-slate-700 bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white"
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${pollingSession ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {webhookData?.webhooks && webhookData.webhooks.length > 0 ? (
                <div className="space-y-4">
                  {webhookData.webhooks.map((webhook) => (
                    <div key={webhook.id} className="rounded-lg border border-slate-700 bg-slate-800/30 p-4">
                      <div className="flex items-center justify-between mb-3">
                        <Badge className="border-indigo-500/30 bg-indigo-500/10 text-indigo-400">
                          {webhook.event}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          {new Date(webhook.received_at).toLocaleString()}
                        </span>
                      </div>
                      <pre className="text-xs text-slate-400 overflow-auto max-h-48 p-3 rounded bg-slate-900">
                        {JSON.stringify(webhook.payload, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Webhook className="h-12 w-12 text-slate-600 mb-4" />
                  <p className="text-slate-400">No webhooks received yet</p>
                  <p className="text-sm text-slate-500">
                    Webhooks will appear here when the KYC process completes
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-400" />
                Credit Ledger
              </CardTitle>
              <CardDescription className="text-slate-400">
                Transaction history for this demo client. Current balance:{" "}
                <span className="font-semibold text-green-400">
                  {demoData?.creditBalance?.toLocaleString() || 0} credits
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {demoData?.creditLedger && demoData.creditLedger.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800 hover:bg-transparent">
                      <TableHead className="text-slate-400">Date & Time</TableHead>
                      <TableHead className="text-slate-400">Type</TableHead>
                      <TableHead className="text-slate-400">Description</TableHead>
                      <TableHead className="text-right text-slate-400">Amount (Credits)</TableHead>
                      <TableHead className="text-right text-slate-400">Balance (Credits)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {demoData.creditLedger.map((entry) => (
                      <TableRow key={entry.id} className="border-slate-800">
                        <TableCell className="text-slate-400 text-sm">
                          {new Date(entry.created_at).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              entry.type === "topup"
                                ? "border-green-500/30 bg-green-500/10 text-green-400"
                                : entry.type === "included"
                                ? "border-indigo-500/30 bg-indigo-500/10 text-indigo-400"
                                : entry.type === "usage"
                                ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                                : entry.type === "refund"
                                ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                                : "border-slate-500/30 bg-slate-500/10 text-slate-400"
                            }
                          >
                            {entry.type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300">
                          {entry.description || "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <span className={`font-medium ${entry.amount >= 0 ? "text-green-400" : "text-red-400"}`}>
                              {entry.amount >= 0 ? "+" : ""}
                              {entry.amount.toLocaleString()}
                            </span>
                            <p className="text-xs text-slate-500">
                              (RM {Math.abs(entry.amount / 10).toFixed(2)})
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div>
                            <span className="text-slate-300">{entry.balance_after.toLocaleString()}</span>
                            <p className="text-xs text-slate-500">
                              (RM {(entry.balance_after / 10).toFixed(2)})
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <DollarSign className="h-12 w-12 text-slate-600 mb-4" />
                  <p className="text-slate-400">No transactions yet</p>
                  <p className="text-sm text-slate-500">
                    Top up credits to see transaction history
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Sessions */}
      {demoData?.recentSessions && demoData.recentSessions.length > 0 && (
        <Card className="border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-white">Recent Sessions</CardTitle>
            <CardDescription className="text-slate-400">
              Previously created KYC sessions for this demo client
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400">Session ID</TableHead>
                  <TableHead className="text-slate-400">Document</TableHead>
                  <TableHead className="text-slate-400">Status</TableHead>
                  <TableHead className="text-slate-400">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demoData.recentSessions.map((session) => (
                  <TableRow key={session.id} className="border-slate-800">
                    <TableCell className="font-mono text-xs text-slate-300">
                      {session.id.substring(0, 8)}...
                    </TableCell>
                    <TableCell className="text-slate-300">
                      <div>
                        <p className="text-sm">{session.document_name}</p>
                        <p className="text-xs text-slate-500">{session.document_number}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(session.status, session.result)}
                    </TableCell>
                    <TableCell className="text-slate-400 text-sm">
                      {new Date(session.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
