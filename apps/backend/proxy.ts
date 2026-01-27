import { NextRequest, NextResponse } from "next/server";

// Allowed origins for CORS (admin app)
const allowedOrigins = [
  "http://localhost:3002", // Admin app local dev
  "https://admin.truestack.my", // Admin app in production
  "https://core.truestack.my", // Core app in production
  process.env.ADMIN_APP_URL, // Additional admin app URL if configured
].filter(Boolean) as string[];

// Next.js 16 proxy - handles CORS for cross-origin auth requests
export function proxy(request: NextRequest) {
  const origin = request.headers.get("origin");
  const isAllowedOrigin = origin && allowedOrigins.includes(origin);

  // Handle CORS preflight requests
  if (request.method === "OPTIONS") {
    const response = new NextResponse(null, { status: 200 });
    
    if (isAllowedOrigin) {
      response.headers.set("Access-Control-Allow-Origin", origin);
    }
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Date, X-Api-Version"
    );
    response.headers.set("Access-Control-Allow-Credentials", "true");
    
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
    "/api/auth/:path*",
    "/api/admin/:path*",
  ],
};
