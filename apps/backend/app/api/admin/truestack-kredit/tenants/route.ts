import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callKreditAdminApi } from "@/lib/kredit-admin-client";

// GET /api/admin/truestack-kredit/tenants
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const forwarded = new URLSearchParams();
    for (const key of ["page", "pageSize", "search"]) {
      const value = searchParams.get(key);
      if (value) forwarded.set(key, value);
    }

    const data = await callKreditAdminApi<{
      success: boolean;
      data: unknown;
    }>({
      endpoint: "/api/internal/kredit/admin/tenants",
      searchParams: forwarded,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("[Admin Kredit Tenants] Error:", error);
    return NextResponse.json(
      {
        error: "SERVER_ERROR",
        message: error instanceof Error ? error.message : "Failed to fetch Kredit tenants",
      },
      { status: 500 }
    );
  }
}
