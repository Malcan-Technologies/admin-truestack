import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@truestack/shared/db";
import { verifyKreditWebhookSignature } from "@truestack/shared/hmac-webhook";

const KREDIT_WEBHOOK_SECRET = process.env.KREDIT_WEBHOOK_SECRET || "";
const TRUESTACK_KREDIT_PARENT_CODE = "TRUESTACK_KREDIT";

// POST /api/webhooks/kredit/subscription-payment-request
// Receives pending payment request when Kredit tenant submits transfer confirmation.
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-kredit-signature");
    const timestamp = request.headers.get("x-kredit-timestamp");

    if (!KREDIT_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: "SERVER_ERROR", message: "Webhook not configured" },
        { status: 500 }
      );
    }

    const verification = verifyKreditWebhookSignature(
      rawBody,
      signature,
      timestamp,
      KREDIT_WEBHOOK_SECRET
    );
    if (!verification.valid) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: verification.error || "Invalid signature" },
        { status: 401 }
      );
    }

    let body: {
      event?: string;
      request_id?: string;
      tenant_id?: string;
      tenant_slug?: string;
      tenant_name?: string;
      plan?: string;
      amount_cents?: number;
      amount_myr?: number;
      payment_reference?: string;
      period_start?: string;
      period_end?: string;
      requested_at?: string;
      requested_add_ons?: string[];
      decision_webhook_url?: string;
    };

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (body.event !== "subscription.payment.requested") {
      return NextResponse.json({ ok: true, skipped: "unsupported event" });
    }

    if (
      !body.request_id ||
      !body.tenant_id ||
      !body.plan ||
      typeof body.amount_cents !== "number" ||
      typeof body.amount_myr !== "number" ||
      !body.payment_reference ||
      !body.period_start ||
      !body.period_end ||
      !body.requested_at
    ) {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          message:
            "request_id, tenant_id, plan, amount_cents, amount_myr, payment_reference, period_start, period_end, and requested_at are required",
        },
        { status: 400 }
      );
    }

    const parentClient = await queryOne<{ id: string }>(
      `SELECT id FROM client 
       WHERE code = $1 AND client_type = 'parent' AND client_source = 'truestack_kredit' AND status = 'active'`,
      [TRUESTACK_KREDIT_PARENT_CODE]
    );

    let tenantClientId: string | null = null;
    if (parentClient) {
      const tenantClient = await queryOne<{ id: string }>(
        `SELECT id FROM client
         WHERE parent_client_id = $1 AND (kredit_tenant_id = $2 OR tenant_slug = $3) AND status = 'active'`,
        [parentClient.id, body.tenant_id, body.tenant_slug ?? body.tenant_id]
      );
      tenantClientId = tenantClient?.id ?? null;
    }

    const rows = await query<{
      id: string;
      request_id: string;
      status: string;
      client_id: string | null;
    }>(
      `INSERT INTO kredit_subscription_payment
         (request_id, tenant_id, tenant_slug, tenant_name, client_id, plan, amount_cents, amount_myr,
          payment_reference, period_start, period_end, requested_at, requested_add_ons, decision_webhook_url, raw_payload)
       VALUES
         ($1, $2, $3, $4, $5, $6, $7, $8::decimal, $9, $10::date, $11::date, $12::timestamp, $13::jsonb, $14, $15::jsonb)
       ON CONFLICT (request_id) DO UPDATE SET
         tenant_id = EXCLUDED.tenant_id,
         tenant_slug = EXCLUDED.tenant_slug,
         tenant_name = EXCLUDED.tenant_name,
         client_id = COALESCE(kredit_subscription_payment.client_id, EXCLUDED.client_id),
         plan = EXCLUDED.plan,
         amount_cents = EXCLUDED.amount_cents,
         amount_myr = EXCLUDED.amount_myr,
         payment_reference = EXCLUDED.payment_reference,
         period_start = EXCLUDED.period_start,
         period_end = EXCLUDED.period_end,
         requested_at = EXCLUDED.requested_at,
         requested_add_ons = EXCLUDED.requested_add_ons,
         decision_webhook_url = EXCLUDED.decision_webhook_url,
         raw_payload = EXCLUDED.raw_payload,
         updated_at = NOW()
       RETURNING id, request_id, status, client_id`,
      [
        body.request_id,
        body.tenant_id,
        body.tenant_slug ?? null,
        body.tenant_name ?? null,
        tenantClientId,
        body.plan,
        body.amount_cents,
        body.amount_myr,
        body.payment_reference,
        body.period_start,
        body.period_end,
        body.requested_at,
        JSON.stringify(body.requested_add_ons ?? []),
        body.decision_webhook_url ?? "/api/webhooks/kredit/subscription-payment-decision",
        rawBody,
      ]
    );

    const row = rows[0];
    return NextResponse.json({
      success: true,
      id: row.id,
      request_id: row.request_id,
      status: row.status,
      client_id: row.client_id,
    });
  } catch (error) {
    console.error("[Kredit Subscription Payment Request] Error:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to process subscription payment request" },
      { status: 500 }
    );
  }
}
