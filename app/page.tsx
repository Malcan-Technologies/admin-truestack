import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, ExternalLink } from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <CardHeader className="text-center">
          {/* Logo */}
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/25">
            <span className="text-2xl font-bold text-white">T</span>
          </div>
          <CardTitle className="text-2xl font-semibold text-white">
            TrueStack Admin
          </CardTitle>
          <CardDescription className="text-slate-400">
            Internal administration portal for TrueStack services
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button
            asChild
            className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 text-white hover:from-indigo-600 hover:to-violet-600"
          >
            <Link href="/login">
              Sign In to Admin Portal
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          
          <Button
            asChild
            variant="outline"
            className="w-full border-slate-700 bg-slate-800/50 text-slate-200 hover:bg-slate-800 hover:text-white"
          >
            <a href="https://truestack.my" target="_blank" rel="noopener noreferrer">
              Visit TrueStack Website
              <ExternalLink className="ml-2 h-4 w-4" />
            </a>
          </Button>
          
          <p className="pt-2 text-center text-xs text-slate-500">
            This is a restricted area for authorized personnel only.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
