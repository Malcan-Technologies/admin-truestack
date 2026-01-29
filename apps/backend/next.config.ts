import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  
  // Disable x-powered-by header for security
  poweredByHeader: false,
  
  // Transpile shared package
  transpilePackages: ["@truestack/shared"],
  
  // Include pdfkit font files in standalone output
  outputFileTracingIncludes: {
    "/api/**/*": ["./node_modules/pdfkit/js/data/**/*"],
  },
  
  // Set Turbopack root to monorepo root for Docker builds
  // This fixes "Next.js inferred your workspace root, but it may not be correct" error
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
};

export default nextConfig;
