import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  output: "standalone",
  
  // Disable x-powered-by header for security
  poweredByHeader: false,
  
  // Set Turbopack root to monorepo root for Docker builds
  // This fixes "Next.js inferred your workspace root, but it may not be correct" error
  turbopack: {
    root: path.join(__dirname, "../.."),
  },
};

export default nextConfig;
