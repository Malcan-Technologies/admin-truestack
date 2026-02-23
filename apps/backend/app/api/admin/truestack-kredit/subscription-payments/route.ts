import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@truestack/shared/db";

function parsePositiveInt(value: string | null, fallback: number, max: number): number {
  const parsed = Number.parseInt(value || "", 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

// GET /api/admin/truestack-kredit/subscription-payments
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status")?.trim().toLowerCase() || "";
    const search = searchParams.get("search")?.trim() || "";
    const page = parsePositiveInt(searchParams.get("page"), 1, 100000);
    const pageSize = parsePositiveInt(searchParams.get("pageSize"), 20, 100);
    const offset = (page - 1) * pageSize;

    const normalizedStatus =
      status === "pending" || status === "approved" || status === "rejected" ? status : null;
    const searchLike = search ? `%${search}%` : null;

    const [rows, countRow] = await Promise.all([
      query<{
        id: string;
        request_id: string;
        tenant_id: string;
        tenant_slug: string | null;
        tenant_name: string | null;
        client_id: string | null;
        client_name: string | null;
        plan: string;
        amount_cents: number;
        amount_myr: string;
        payment_reference: string;
        period_start: string;
        period_end: string;
        requested_at: string;
        requested_add_ons: unknown;
        status: string;
        rejection_reason: string | null;
        approved_at: string | null;
        rejected_at: string | null;
        decision_webhook_delivered: boolean;
        decision_webhook_attempts: number;
        decision_webhook_last_error: string | null;
      }>(
        `SELECT
           ksp.id,
           ksp.request_id,
           ksp.tenant_id,
           ksp.tenant_slug,
           ksp.tenant_name,
           ksp.client_id,
           c.name AS client_name,
           ksp.plan,
           ksp.amount_cents,
           ksp.amount_myr::text,
           ksp.payment_reference,
           ksp.period_start::text,
           ksp.period_end::text,
           ksp.requested_at::text,
           ksp.requested_add_ons,
           ksp.status,
           ksp.rejection_reason,
           ksp.approved_at::text,
           ksp.rejected_at::text,
           ksp.decision_webhook_delivered,
           ksp.decision_webhook_attempts,
           ksp.decision_webhook_last_error
         FROM kredit_subscription_payment ksp
         LEFT JOIN client c ON c.id = ksp.client_id
         WHERE
           ($1::text IS NULL OR ksp.status = $1)
           AND (
             $2::text IS NULL
             OR ksp.request_id ILIKE $2
             OR ksp.tenant_id ILIKE $2
             OR COALESCE(ksp.tenant_slug, '') ILIKE $2
             OR COALESCE(ksp.tenant_name, '') ILIKE $2
             OR ksp.payment_reference ILIKE $2
             OR COALESCE(c.name, '') ILIKE $2
           )
         ORDER BY ksp.requested_at DESC
         LIMIT $3 OFFSET $4`,
        [normalizedStatus, searchLike, pageSize, offset]
      ),
      queryOne<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM kredit_subscription_payment ksp
         LEFT JOIN client c ON c.id = ksp.client_id
         WHERE
           ($1::text IS NULL OR ksp.status = $1)
           AND (
             $2::text IS NULL
             OR ksp.request_id ILIKE $2
             OR ksp.tenant_id ILIKE $2
             OR COALESCE(ksp.tenant_slug, '') ILIKE $2
             OR COALESCE(ksp.tenant_name, '') ILIKE $2
             OR ksp.payment_reference ILIKE $2
             OR COALESCE(c.name, '') ILIKE $2
           )`,
        [normalizedStatus, searchLike]
      ),
    ]);

    const total = Number.parseInt(countRow?.count || "0", 10);

    return NextResponse.json({
      success: true,
      data: {
        items: rows.map((row) => ({
          id: row.id,
          requestId: row.request_id,
          tenantId: row.tenant_id,
          tenantSlug: row.tenant_slug,
          tenantName: row.tenant_name,
          clientId: row.client_id,
          clientName: row.client_name,
          plan: row.plan,
          amountCents: row.amount_cents,
          amountMyr: Number(row.amount_myr),
          paymentReference: row.payment_reference,
          periodStart: row.period_start,
          periodEnd: row.period_end,
          requestedAt: row.requested_at,
          requestedAddOns: Array.isArray(row.requested_add_ons) ? row.requested_add_ons : [],
          status: row.status,
          rejectionReason: row.rejection_reason,
          approvedAt: row.approved_at,
          rejectedAt: row.rejected_at,
          decisionWebhookDelivered: row.decision_webhook_delivered,
          decisionWebhookAttempts: row.decision_webhook_attempts,
          decisionWebhookLastError: row.decision_webhook_last_error,
        })),
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
        },
      },
    });
  } catch (error) {
    console.error("[Admin Kredit Subscription Payments] Error:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to fetch subscription payments" },
      { status: 500 }
    );
  }
}
