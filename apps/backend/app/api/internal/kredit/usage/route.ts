import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@truestack/shared/db";
import { computeUsageFromVerificationCount } from "@truestack/shared";

const TRUESTACK_KREDIT_PARENT_CODE = "TRUESTACK_KREDIT";

function verifyInternalAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const expectedKey = process.env.INTERNAL_API_KEY || process.env.KREDIT_INTERNAL_SECRET;
  return !!expectedKey && authHeader === `Bearer ${expectedKey}`;
}

// GET /api/internal/kredit/usage?tenant_id=&period_start=&period_end=
export async function GET(request: NextRequest) {
  try {
    if (!verifyInternalAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenant_id");
    const periodStart = searchParams.get("period_start");
    const periodEnd = searchParams.get("period_end");

    if (!tenantId || !periodStart || !periodEnd) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "tenant_id, period_start, and period_end are required" },
        { status: 400 }
      );
    }

    const parentClient = await queryOne<{ id: string }>(
      `SELECT id FROM client 
       WHERE code = $1 AND client_type = 'parent' AND client_source = 'truestack_kredit' AND status = 'active'`,
      [TRUESTACK_KREDIT_PARENT_CODE]
    );

    if (!parentClient) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Kredit parent not configured" },
        { status: 404 }
      );
    }

    const tenantClient = await queryOne<{ id: string }>(
      `SELECT id FROM client 
       WHERE parent_client_id = $1 AND (tenant_slug = $2 OR code = $3) AND status = 'active'`,
      [parentClient.id, tenantId, `KREDIT_${tenantId}`]
    );

    if (!tenantClient) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: `Tenant not found: ${tenantId}` },
        { status: 404 }
      );
    }

    const usageResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count 
       FROM kyc_session 
       WHERE client_id = $1 
         AND billed = true
         AND billed_at >= $2::timestamp
         AND billed_at <= $3::timestamp`,
      [tenantClient.id, periodStart, periodEnd]
    );

    const verificationCount = parseInt(usageResult?.count || "0", 10);
    const { usageCredits, usageAmountMyr } =
      computeUsageFromVerificationCount(verificationCount);

    return NextResponse.json({
      tenant_id: tenantId,
      client_id: tenantClient.id,
      period_start: periodStart,
      period_end: periodEnd,
      verification_count: verificationCount,
      usage_credits: usageCredits,
      usage_amount_myr: usageAmountMyr,
    });
  } catch (error) {
    console.error("[Kredit Usage API] Error:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}
