import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  
  // Disable x-powered-by header for security
  poweredByHeader: false,
};

export default nextConfig;
