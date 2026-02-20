import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@truestack/shared/db";

// GET /api/admin/clients/:id/tenant-billing-periods - List tenant billing periods for Kredit clients
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId } = await params;

    const client = await queryOne<{ client_source: string | null }>(
      `SELECT COALESCE(client_source, 'api') as client_source FROM client WHERE id = $1`,
      [clientId]
    );

    if (!client || client.client_source !== "truestack_kredit") {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Tenant billing periods are only for TrueStack Kredit clients" },
        { status: 403 }
      );
    }

    const periods = await query<{
      id: string;
      period_start: string;
      period_end: string;
      verification_count: number;
      usage_amount_myr: number;
      payment_status: string;
      paid_at: string | null;
      paid_amount_myr: number | null;
      webhook_delivered: boolean;
    }>(
      `SELECT id, period_start, period_end, verification_count, usage_amount_myr,
              payment_status, paid_at, paid_amount_myr, webhook_delivered
       FROM tenant_billing_period
       WHERE client_id = $1
       ORDER BY period_start DESC
       LIMIT 24`,
      [clientId]
    );

    return NextResponse.json({ periods });
  } catch (error) {
    console.error("[Tenant Billing Periods] Error:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to fetch billing periods" },
      { status: 500 }
    );
  }
}
