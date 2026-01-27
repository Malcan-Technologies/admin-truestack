import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  
  // Disable x-powered-by header for security
  poweredByHeader: false,
  
  // Enable server component HMR
  experimental: {
    // Add any experimental features here if needed
  },
  
  // Allow external images (if needed)
  images: {
    remotePatterns: [
      // Add remote image patterns here if needed
    ],
  },
};

export default nextConfig;
