import {
  ArrowRight,
  Shield,
  Zap,
  Users,
  Fingerprint,
  Clock,
  CheckCircle2,
  Terminal,
  Copy,
  ExternalLink,
  ArrowUpRight,
  Building2,
  TrendingUp,
  Lock,
  FileCheck,
  Globe,
  BadgeCheck,
  Smartphone,
  Monitor,
  Camera,
  ScanFace,
  Webhook,
} from "lucide-react";

const businessBenefits = [
  {
    icon: TrendingUp,
    title: "Accelerate Customer Onboarding",
    description: "Reduce onboarding time from days to minutes. Verify customers instantly while maintaining compliance.",
  },
  {
    icon: Shield,
    title: "Reduce Fraud & Risk",
    description: "AI-powered fraud detection with liveness checks prevents identity spoofing and document forgery.",
  },
  {
    icon: Lock,
    title: "Stay Compliant",
    description: "Meet regulatory requirements with our PDPA-compliant solution. Full audit trails and data residency in Malaysia.",
  },
  {
    icon: TrendingUp,
    title: "Lower Operational Costs",
    description: "Automate manual verification processes. Scale without adding headcount or infrastructure.",
  },
];

const useCases = [
  {
    icon: Building2,
    title: "Financial Services",
    description: "Banks, lenders, and fintechs use TrueIdentity for loan applications, account opening, and regulatory compliance.",
  },
  {
    icon: Users,
    title: "Digital Platforms",
    description: "E-commerce, gig economy, and sharing platforms verify sellers, drivers, and service providers.",
  },
  {
    icon: Globe,
    title: "Telecommunications",
    description: "Telcos and digital services verify subscribers for SIM registration and account activation.",
  },
];

const capabilities = [
  { label: "MyKad OCR extraction", icon: FileCheck },
  { label: "Liveness detection", icon: BadgeCheck },
  { label: "Facial biometric matching", icon: Fingerprint },
  { label: "Real-time verification", icon: Zap },
  { label: "Fraud detection", icon: Shield },
  { label: "Audit trail logging", icon: Clock },
];

const trustedBy = [
  "Licensed money lenders",
  "Digital banks",
  "Insurance providers",
  "E-commerce platforms",
  "Fintech startups",
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950">
      {/* Grid Background */}
      <div className="fixed inset-0 pointer-events-none">
        <svg className="absolute inset-0 h-full w-full opacity-[0.02]">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 h-[600px] w-[600px] -translate-y-1/2 rounded-full bg-linear-to-r from-indigo-500/10 to-violet-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-[400px] w-[400px] translate-y-1/2 rounded-full bg-linear-to-r from-violet-500/10 to-purple-500/10 blur-3xl" />
      </div>

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="flex items-center gap-3">
            <img 
              src="/truestack-white.svg" 
              alt="TrueStack" 
              className="h-7"
            />
            <span className="text-lg font-semibold bg-linear-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Core
            </span>
          </a>
          <nav className="hidden md:flex items-center gap-6">
            <a href="#benefits" className="text-slate-400 hover:text-white transition text-sm">Benefits</a>
            <a href="#how-it-works" className="text-slate-400 hover:text-white transition text-sm">How It Works</a>
            <a href="#developers" className="text-slate-400 hover:text-white transition text-sm">Developers</a>
            <a
              href="https://truestack.my"
              className="text-slate-400 hover:text-white transition text-sm flex items-center gap-1"
            >
              truestack.my <ExternalLink className="w-3 h-3" />
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <a
              href="https://truestack.my"
              className="hidden sm:flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition px-3 py-2"
            >
              <ArrowUpRight className="w-4 h-4" />
              Main Website
            </a>
            <a
              href="https://admin.truestack.my"
              className="bg-linear-to-r from-indigo-500 to-violet-500 text-white px-4 py-2 rounded-lg hover:from-indigo-600 hover:to-violet-600 transition text-sm font-medium"
            >
              Sign In
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section - Business Focused */}
      <section className="relative py-24 md:py-32">
        <div className="max-w-6xl mx-auto px-6">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 mb-6">
              <Fingerprint className="h-4 w-4 text-indigo-400" />
              <span className="text-sm text-indigo-400 font-medium">TrueIdentity™ e-KYC</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight mb-6">
              <span className="text-white">Verify Customers</span>
              <br />
              <span className="bg-linear-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
                In Seconds, Not Days
              </span>
            </h1>
            <p className="text-lg md:text-xl text-slate-400 mb-8 leading-relaxed max-w-2xl mx-auto">
              TrueIdentity is Malaysia&apos;s e-KYC platform for businesses. Automate identity verification, 
              reduce fraud, and stay compliant — all while delivering a seamless customer experience.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="mailto:hello@truestack.my"
                className="bg-linear-to-r from-indigo-500 to-violet-500 text-white px-8 py-3.5 rounded-lg hover:from-indigo-600 hover:to-violet-600 transition flex items-center justify-center gap-2 font-medium text-base"
              >
                Request a Demo <ArrowRight className="w-5 h-5" />
              </a>
              <a
                href="#how-it-works"
                className="border border-slate-700 bg-slate-900/50 text-white px-8 py-3.5 rounded-lg hover:bg-slate-800 transition text-center font-medium text-base"
              >
                See How It Works
              </a>
            </div>
          </div>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20 pt-12 border-t border-slate-800">
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold bg-linear-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">&lt;3s</div>
              <div className="text-sm text-slate-500 mt-1">Verification Time</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold bg-linear-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">99.9%</div>
              <div className="text-sm text-slate-500 mt-1">Uptime SLA</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold bg-linear-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">100%</div>
              <div className="text-sm text-slate-500 mt-1">Malaysia-Hosted</div>
            </div>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold bg-linear-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">PDPA</div>
              <div className="text-sm text-slate-500 mt-1">Compliant</div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section - Business Focused */}
      <section id="benefits" className="relative py-20 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              <span className="bg-linear-to-r from-indigo-500 to-indigo-400 bg-clip-text text-transparent">
                Why Leading Businesses Choose TrueIdentity
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Streamline your KYC process, reduce operational costs, and deliver 
              a frictionless onboarding experience for your customers.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-6">
            {businessBenefits.map((benefit) => (
              <div
                key={benefit.title}
                className="group rounded-xl border border-slate-800 bg-slate-900/50 p-8 transition-all hover:border-indigo-500/30 hover:bg-slate-900"
              >
                <div className="flex gap-5">
                  <div className="shrink-0 flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-500/10 transition-colors group-hover:bg-indigo-500/20">
                    <benefit.icon className="h-7 w-7 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">{benefit.title}</h3>
                    <p className="text-slate-400 leading-relaxed">{benefit.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="relative py-20 border-t border-slate-800 bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              <span className="bg-linear-to-r from-indigo-500 to-indigo-400 bg-clip-text text-transparent">
                Simple, Secure Verification
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              A seamless verification flow that takes seconds, not minutes.
            </p>
          </div>

          {/* Process Steps */}
          <div className="flex flex-col md:flex-row gap-8 mb-16">
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 text-white font-bold shrink-0 relative z-10">
                  1
                </div>
                <div className="hidden md:block flex-1 h-0.5 bg-slate-700" />
                <h3 className="text-lg font-semibold text-white md:hidden">Capture Document</h3>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 hidden md:block">Capture Document</h3>
              <p className="text-slate-400">
                Customer takes a photo of their MyKad. Our OCR extracts all details automatically.
              </p>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 text-white font-bold shrink-0 relative z-10">
                  2
                </div>
                <div className="hidden md:block flex-1 h-0.5 bg-slate-700" />
                <h3 className="text-lg font-semibold text-white md:hidden">Verify Identity</h3>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 hidden md:block">Verify Identity</h3>
              <p className="text-slate-400">
                Selfie capture with liveness detection. AI matches face to document photo.
              </p>
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500 text-white font-bold shrink-0 relative z-10">
                  3
                </div>
                <h3 className="text-lg font-semibold text-white md:hidden">Get Results</h3>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2 hidden md:block">Get Results</h3>
              <p className="text-slate-400">
                Receive instant verification results with confidence scores and extracted data.
              </p>
            </div>
          </div>

          {/* Capabilities Grid */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8">
            <h3 className="text-xl font-semibold text-white mb-6 text-center">Complete Verification Suite</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {capabilities.map((capability) => (
                <div key={capability.label} className="flex items-center gap-3 p-3 rounded-lg bg-slate-800/50">
                  <capability.icon className="h-5 w-5 text-indigo-400 shrink-0" />
                  <span className="text-sm text-slate-300">{capability.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Hosted UI Section */}
      <section className="relative py-20 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 mb-6">
                <Monitor className="h-4 w-4 text-indigo-400" />
                <span className="text-sm text-indigo-400 font-medium">Hosted UI</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
                <span className="bg-linear-to-r from-indigo-500 to-indigo-400 bg-clip-text text-transparent">
                  We Handle the Frontend
                </span>
              </h2>
              <p className="text-slate-400 text-lg mb-8 leading-relaxed">
                No need to build verification UI yourself. We provide a fully hosted customer frontend 
                that handles the entire verification flow — just redirect your users and receive results via webhook.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 shrink-0">
                    <Camera className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Document Capture</h4>
                    <p className="text-sm text-slate-400">Camera access and file upload for MyKad photos with built-in quality checks.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 shrink-0">
                    <ScanFace className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Liveness & Selfie</h4>
                    <p className="text-sm text-slate-400">Real-time liveness detection with guided selfie capture flow.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 shrink-0">
                    <Webhook className="h-4 w-4 text-indigo-400" />
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">Webhook Results</h4>
                    <p className="text-sm text-slate-400">Receive verification results instantly via secure webhook to your backend.</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-indigo-400" />
                  <span className="text-sm text-slate-300">Works on Web</span>
                </div>
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-indigo-400" />
                  <span className="text-sm text-slate-300">Works on Mobile</span>
                </div>
              </div>
            </div>

            {/* Illustrations */}
            <div className="relative">
              <div className="grid gap-6">
                {/* Web Browser Mockup */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                  <div className="mb-3 flex items-center gap-2">
                    <Globe className="h-5 w-5 text-indigo-400" />
                    <span className="text-sm font-medium text-white">Web Browser</span>
                    <span className="ml-auto text-xs text-slate-500">Desktop & Tablet</span>
                  </div>
                  {/* Browser mockup */}
                  <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
                    {/* Browser header */}
                    <div className="flex items-center gap-2 border-b border-slate-700 bg-slate-900 px-3 py-2">
                      <div className="flex gap-1.5">
                        <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
                        <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/80" />
                        <div className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
                      </div>
                      <div className="ml-2 flex-1 rounded bg-slate-800 px-3 py-1 text-xs text-slate-400">
                        verify.truestack.my/session/abc123
                      </div>
                    </div>
                    {/* Screen content - Verification UI */}
                    <div className="p-6 bg-slate-950">
                      <div className="text-center mb-4">
                        <div className="mx-auto mb-2 h-3 w-32 rounded bg-indigo-500/30" />
                        <div className="mx-auto h-2 w-48 rounded bg-slate-700" />
                      </div>
                      {/* Camera preview area */}
                      <div className="mx-auto max-w-xs">
                        <div className="aspect-4/3 rounded-lg border-2 border-dashed border-indigo-500/30 bg-slate-900 flex items-center justify-center">
                          <div className="text-center">
                            <Camera className="h-8 w-8 text-indigo-400/50 mx-auto mb-2" />
                            <div className="h-2 w-24 rounded bg-slate-700 mx-auto" />
                          </div>
                        </div>
                        <div className="mt-4 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                          <div className="h-2 w-20 rounded bg-indigo-400/50" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Mockups - Side by side */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Mobile - Document Capture */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <Smartphone className="h-5 w-5 text-indigo-400" />
                      <span className="text-sm font-medium text-white">Mobile</span>
                    </div>
                    {/* Phone mockup */}
                    <div className="mx-auto w-28">
                      <div className="overflow-hidden rounded-2xl border-2 border-slate-600 bg-slate-800">
                        {/* Phone notch */}
                        <div className="mx-auto h-4 w-12 rounded-b-lg bg-slate-900" />
                        {/* Screen content */}
                        <div className="p-3 bg-slate-950">
                          <div className="mb-2 h-2 w-16 rounded bg-indigo-500/30 mx-auto" />
                          <div className="mb-3 h-1.5 w-20 rounded bg-slate-700 mx-auto" />
                          {/* MyKad outline */}
                          <div className="aspect-[1.6/1] rounded border border-dashed border-indigo-500/40 bg-slate-900 flex items-center justify-center mb-2">
                            <FileCheck className="h-4 w-4 text-indigo-400/40" />
                          </div>
                          <div className="h-6 rounded bg-indigo-500/20 flex items-center justify-center">
                            <div className="h-1.5 w-12 rounded bg-indigo-400/50" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-center text-xs text-slate-500">Document Capture</p>
                  </div>

                  {/* Mobile - Selfie */}
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <ScanFace className="h-5 w-5 text-indigo-400" />
                      <span className="text-sm font-medium text-white">Selfie</span>
                    </div>
                    {/* Phone mockup */}
                    <div className="mx-auto w-28">
                      <div className="overflow-hidden rounded-2xl border-2 border-slate-600 bg-slate-800">
                        {/* Phone notch */}
                        <div className="mx-auto h-4 w-12 rounded-b-lg bg-slate-900" />
                        {/* Screen content */}
                        <div className="p-3 bg-slate-950">
                          <div className="mb-2 h-2 w-14 rounded bg-indigo-500/30 mx-auto" />
                          {/* Face outline circle */}
                          <div className="mx-auto w-14 h-14 rounded-full border-2 border-dashed border-indigo-500/40 bg-slate-900 flex items-center justify-center mb-2">
                            <ScanFace className="h-5 w-5 text-indigo-400/40" />
                          </div>
                          <div className="mb-1.5 h-1.5 w-full rounded bg-slate-700" />
                          <div className="h-6 rounded bg-green-500/20 flex items-center justify-center">
                            <div className="h-1.5 w-10 rounded bg-green-400/50" />
                          </div>
                        </div>
                      </div>
                    </div>
                    <p className="mt-3 text-center text-xs text-slate-500">Liveness Check</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Use Cases Section */}
      <section className="relative py-20 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              <span className="bg-linear-to-r from-indigo-500 to-indigo-400 bg-clip-text text-transparent">
                Built for Every Industry
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              From banks to startups, businesses across Malaysia trust TrueIdentity.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {useCases.map((useCase) => (
              <div
                key={useCase.title}
                className="group rounded-xl border border-slate-800 bg-slate-900/50 p-6 transition-all hover:border-indigo-500/30 hover:bg-slate-900"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-500/10 transition-colors group-hover:bg-indigo-500/20">
                  <useCase.icon className="h-6 w-6 text-indigo-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{useCase.title}</h3>
                <p className="text-sm text-slate-400">{useCase.description}</p>
              </div>
            ))}
          </div>

          {/* Trusted By */}
          <div className="mt-16 text-center">
            <p className="text-sm text-slate-500 mb-6">Trusted by</p>
            <div className="flex flex-wrap justify-center gap-4">
              {trustedBy.map((item) => (
                <span key={item} className="px-4 py-2 rounded-full border border-slate-800 bg-slate-900/50 text-sm text-slate-400">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Developer Section - Code Examples */}
      <section id="developers" className="relative py-20 border-t border-slate-800 bg-slate-900/30">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 mb-6">
              <Terminal className="h-4 w-4 text-indigo-400" />
              <span className="text-sm text-indigo-400 font-medium">For Developers</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
              <span className="bg-linear-to-r from-indigo-500 to-indigo-400 bg-clip-text text-transparent">
                Integrate in Minutes
              </span>
            </h2>
            <p className="text-slate-400 text-lg max-w-2xl mx-auto">
              Simple REST API with comprehensive documentation. Your team can start verifying customers today.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* TypeScript Example */}
            <div className="code-block shadow-2xl shadow-indigo-500/10">
              <div className="code-header">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <span className="ml-2">verify.ts</span>
                </div>
                <button className="text-slate-500 hover:text-slate-300 transition">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <pre className="text-[#d4d4d4]">
                <code>
                  <span className="token-comment">{"// Initialize TrueIdentity client"}</span>{"\n"}
                  <span className="token-keyword">import</span> {"{"} <span className="token-class">TrueIdentity</span> {"}"} <span className="token-keyword">from</span> <span className="token-string">&apos;@truestack/identity&apos;</span>;{"\n\n"}
                  <span className="token-keyword">const</span> <span className="token-variable">client</span> <span className="token-operator">=</span> <span className="token-keyword">new</span> <span className="token-class">TrueIdentity</span><span className="token-punctuation">({"{"}</span>{"\n"}
                  {"  "}<span className="token-property">apiKey</span><span className="token-punctuation">:</span> <span className="token-variable">process</span>.<span className="token-property">env</span>.<span className="token-property">TRUESTACK_API_KEY</span><span className="token-punctuation">,</span>{"\n"}
                  {"  "}<span className="token-property">environment</span><span className="token-punctuation">:</span> <span className="token-string">&apos;production&apos;</span>{"\n"}
                  <span className="token-punctuation">{"})"}</span>;{"\n\n"}
                  <span className="token-comment">{"// Verify a customer"}</span>{"\n"}
                  <span className="token-keyword">const</span> <span className="token-variable">result</span> <span className="token-operator">=</span> <span className="token-keyword">await</span> <span className="token-variable">client</span>.<span className="token-method">verify</span><span className="token-punctuation">({"{"}</span>{"\n"}
                  {"  "}<span className="token-property">document</span><span className="token-punctuation">:</span> <span className="token-variable">myKadImage</span><span className="token-punctuation">,</span>{"\n"}
                  {"  "}<span className="token-property">selfie</span><span className="token-punctuation">:</span> <span className="token-variable">customerSelfie</span><span className="token-punctuation">,</span>{"\n"}
                  {"  "}<span className="token-property">options</span><span className="token-punctuation">:</span> {"{"}{"\n"}
                  {"    "}<span className="token-property">livenessCheck</span><span className="token-punctuation">:</span> <span className="token-boolean">true</span><span className="token-punctuation">,</span>{"\n"}
                  {"    "}<span className="token-property">ocrExtraction</span><span className="token-punctuation">:</span> <span className="token-boolean">true</span>{"\n"}
                  {"  }"}{"\n"}
                  <span className="token-punctuation">{"})"}</span>;{"\n\n"}
                  <span className="token-variable">console</span>.<span className="token-method">log</span><span className="token-punctuation">(</span><span className="token-variable">result</span>.<span className="token-property">verified</span><span className="token-punctuation">)</span>; <span className="token-comment">{"// true"}</span>{"\n"}
                  <span className="token-variable">console</span>.<span className="token-method">log</span><span className="token-punctuation">(</span><span className="token-variable">result</span>.<span className="token-property">confidence</span><span className="token-punctuation">)</span>; <span className="token-comment">{"// 0.98"}</span>
                </code>
              </pre>
            </div>

            {/* JSON Response */}
            <div className="code-block shadow-2xl shadow-indigo-500/10">
              <div className="code-header">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <span className="ml-2">response.json</span>
                </div>
              </div>
              <pre className="text-[#d4d4d4]">
                <code>
                  <span className="token-punctuation">{"{"}</span>{"\n"}
                  {"  "}<span className="token-property">&quot;verified&quot;</span><span className="token-punctuation">:</span> <span className="token-boolean">true</span><span className="token-punctuation">,</span>{"\n"}
                  {"  "}<span className="token-property">&quot;confidence&quot;</span><span className="token-punctuation">:</span> <span className="token-number">0.98</span><span className="token-punctuation">,</span>{"\n"}
                  {"  "}<span className="token-property">&quot;document&quot;</span><span className="token-punctuation">:</span> <span className="token-punctuation">{"{"}</span>{"\n"}
                  {"    "}<span className="token-property">&quot;type&quot;</span><span className="token-punctuation">:</span> <span className="token-string">&quot;mykad&quot;</span><span className="token-punctuation">,</span>{"\n"}
                  {"    "}<span className="token-property">&quot;id_number&quot;</span><span className="token-punctuation">:</span> <span className="token-string">&quot;******-**-****&quot;</span><span className="token-punctuation">,</span>{"\n"}
                  {"    "}<span className="token-property">&quot;name&quot;</span><span className="token-punctuation">:</span> <span className="token-string">&quot;AHMAD BIN ABDULLAH&quot;</span><span className="token-punctuation">,</span>{"\n"}
                  {"    "}<span className="token-property">&quot;address&quot;</span><span className="token-punctuation">:</span> <span className="token-string">&quot;123 JALAN EXAMPLE...&quot;</span>{"\n"}
                  {"  "}<span className="token-punctuation">{"}"}</span><span className="token-punctuation">,</span>{"\n"}
                  {"  "}<span className="token-property">&quot;checks&quot;</span><span className="token-punctuation">:</span> <span className="token-punctuation">{"{"}</span>{"\n"}
                  {"    "}<span className="token-property">&quot;liveness&quot;</span><span className="token-punctuation">:</span> <span className="token-boolean">true</span><span className="token-punctuation">,</span>{"\n"}
                  {"    "}<span className="token-property">&quot;face_match&quot;</span><span className="token-punctuation">:</span> <span className="token-boolean">true</span><span className="token-punctuation">,</span>{"\n"}
                  {"    "}<span className="token-property">&quot;document_valid&quot;</span><span className="token-punctuation">:</span> <span className="token-boolean">true</span>{"\n"}
                  {"  "}<span className="token-punctuation">{"}"}</span>{"\n"}
                  <span className="token-punctuation">{"}"}</span>
                </code>
              </pre>
            </div>
          </div>

          {/* Integration Stats */}
          <div className="grid grid-cols-3 gap-6 mt-12">
            <div className="text-center p-6 rounded-xl border border-slate-800 bg-slate-900/50">
              <div className="text-2xl font-bold text-white">&lt;1 day</div>
              <div className="text-sm text-slate-500 mt-1">Integration time</div>
            </div>
            <div className="text-center p-6 rounded-xl border border-slate-800 bg-slate-900/50">
              <div className="text-2xl font-bold text-white">REST API</div>
              <div className="text-sm text-slate-500 mt-1">Simple integration</div>
            </div>
            <div className="text-center p-6 rounded-xl border border-slate-800 bg-slate-900/50">
              <div className="text-2xl font-bold text-white">SDK</div>
              <div className="text-sm text-slate-500 mt-1">Node.js, Python, Go</div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-20 border-t border-slate-800">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-semibold tracking-tight mb-4">
            <span className="bg-linear-to-r from-indigo-400 via-violet-400 to-purple-400 bg-clip-text text-transparent">
              Ready to Transform Your KYC Process?
            </span>
          </h2>
          <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto">
            Join leading Malaysian businesses using TrueIdentity. Get started with a demo today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="mailto:hello@truestack.my"
              className="bg-linear-to-r from-indigo-500 to-violet-500 text-white px-8 py-3 rounded-lg hover:from-indigo-600 hover:to-violet-600 transition inline-flex items-center justify-center gap-2 font-medium"
            >
              Request a Demo <ArrowRight className="w-5 h-5" />
            </a>
            <a
              href="https://truestack.my"
              className="border border-slate-700 bg-slate-900/50 text-white px-8 py-3 rounded-lg hover:bg-slate-800 transition inline-flex items-center justify-center gap-2 font-medium"
            >
              <ArrowUpRight className="w-5 h-5" />
              Visit truestack.my
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <a href="/" className="flex items-center gap-3">
              <img 
                src="/truestack-white.svg" 
                alt="TrueStack" 
                className="h-6"
              />
              <span className="text-sm font-semibold bg-linear-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                Core
              </span>
            </a>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <a href="https://truestack.my" className="hover:text-white transition flex items-center gap-1">
                Main Website <ExternalLink className="w-3 h-3" />
              </a>
              <a href="mailto:hello@truestack.my" className="hover:text-white transition">
                Contact
              </a>
              <a href="https://admin.truestack.my" className="hover:text-white transition">
                Sign In
              </a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-slate-800 text-center text-sm text-slate-500">
            <p>&copy; {new Date().getFullYear()} TrueStack Sdn Bhd. All rights reserved.</p>
            <p className="mt-1">Infrastructure & Identity Services for Malaysia</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
