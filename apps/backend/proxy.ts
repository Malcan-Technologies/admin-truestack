import { NextRequest, NextResponse } from "next/server";

// Allowed origins for CORS
const allowedOrigins = [
  // Local development
  "http://localhost:3000", // Core app local dev
  "http://localhost:3001", // Backend local dev (self)
  "http://localhost:3002", // Admin app local dev
  // Production domains
  "https://api.truestack.my", // Backend API
  "https://admin.truestack.my", // Admin app
  "https://core.truestack.my", // Core app
  "https://truestack.my", // Main website
  "https://www.truestack.my", // Main website with www
  // Environment-configured URLs
  process.env.ADMIN_APP_URL,
  process.env.CORE_APP_URL,
].filter(Boolean) as string[];

// Next.js 16 proxy - handles CORS for cross-origin API requests
export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);

  // Handle CORS preflight requests
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 200 });
    
    if (isAllowedOrigin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version"
    );
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set("Access-Control-Max-Age", "86400"); // Cache preflight for 24 hours
    
    return response;
  }

  // Handle actual requests
  const response = NextResponse.next();
  
  if (isAllowedOrigin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
  }
  response.headers.set("Access-Control-Allow-Credentials", "true");
  
  return response;
}

export const config = {
  matcher: [
    // All API routes
    "/api/:path*",
  ],
};
