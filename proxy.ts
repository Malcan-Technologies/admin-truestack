import { NextRequest, NextResponse } from "next/server";

// Proxy is now only for routing concerns (rewrites, redirects, headers)
// Authentication is handled in server layouts per Next.js 16 best practices
export function proxy(request: NextRequest) {
  // Allow all requests to pass through
  // Auth is handled in the (dashboard) layout
  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
