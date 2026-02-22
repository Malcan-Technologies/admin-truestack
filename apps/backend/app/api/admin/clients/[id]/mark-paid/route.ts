import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@truestack/shared/db";
import { signOutboundWebhook } from "@truestack/shared/hmac-webhook";

// POST /api/admin/clients/:id/mark-paid - Mark Kredit tenant billing period as paid
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId } = await params;
    const body = await request.json();
    const { period_start, period_end, paid_amount_myr } = body;

    if (!period_start || !period_end) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "period_start and period_end are required" },
        { status: 400 }
      );
    }

    const client = await queryOne<{
      id: string;
      client_source: string | null;
      kredit_tenant_id: string | null;
      tenant_slug: string | null;
      code: string;
    }>(
      `SELECT id, COALESCE(client_source, 'api') as client_source, kredit_tenant_id, tenant_slug, code 
       FROM client WHERE id = $1`,
      [clientId]
    );

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    if (client.client_source !== "truestack_kredit") {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Mark as paid is only for TrueStack Kredit tenants" },
        { status: 403 }
      );
    }

    const tenantId =
      client.kredit_tenant_id ?? client.tenant_slug ?? client.code.replace(/^(KREDIT_|TK_)/, "");

    const config = await queryOne<{ webhook_url: string | null }>(
      `SELECT webhook_url FROM client_product_config 
       WHERE client_id = $1 AND product_id = 'true_identity'`,
      [clientId]
    );

    const webhookBaseUrl =
      config?.webhook_url ||
      process.env.KREDIT_BACKEND_URL ||
      process.env.KREDIT_PAYMENT_WEBHOOK_URL;

    if (!webhookBaseUrl) {
      return NextResponse.json(
        {
          error: "CONFIG_ERROR",
          message:
            "Webhook URL not configured. Set webhook_url in client config or KREDIT_BACKEND_URL.",
        },
        { status: 500 }
      );
    }

    const paidAt = new Date();
    const amountMyr = paid_amount_myr ?? 0;

    await query(
      `INSERT INTO tenant_billing_period 
        (client_id, period_start, period_end, verification_count, usage_amount_myr, 
         payment_status, paid_at, paid_amount_myr, webhook_delivered, updated_at)
       VALUES ($1, $2::date, $3::date, 0, 0, 'paid', $4, $5, false, NOW())
       ON CONFLICT (client_id, period_start) 
       DO UPDATE SET 
         payment_status = 'paid',
         paid_at = $4,
         paid_amount_myr = COALESCE($5, tenant_billing_period.paid_amount_myr),
         webhook_delivered = false,
         updated_at = NOW()`,
      [clientId, period_start, period_end, paidAt, amountMyr]
    );

    const webhookPayload = {
      event: "payment.recorded",
      tenant_id: tenantId,
      client_id: clientId,
      period_start: period_start,
      period_end: period_end,
      paid_at: paidAt.toISOString(),
      paid_amount_myr: amountMyr,
      timestamp: paidAt.toISOString(),
    };

    const rawBody = JSON.stringify(webhookPayload);
    const outboundSecret =
      process.env.TRUEIDENTITY_WEBHOOK_SECRET || process.env.KREDIT_WEBHOOK_SECRET || "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-TrueStack-Event": "payment.recorded",
    };
    if (outboundSecret) {
      const { signature, timestamp } = signOutboundWebhook(rawBody, outboundSecret);
      headers["x-trueidentity-signature"] = signature;
      headers["x-trueidentity-timestamp"] = timestamp;
    }

    const webhookUrl = webhookBaseUrl.includes("/payment")
      ? webhookBaseUrl
      : `${webhookBaseUrl.replace(/\/$/, "")}/payment`;

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: rawBody,
    });

    await query(
      `UPDATE tenant_billing_period 
       SET webhook_delivered = $1, updated_at = NOW()
       WHERE client_id = $2 AND period_start = $3::date`,
      [response.ok, clientId, period_start]
    );

    return NextResponse.json({
      success: true,
      message: "Marked as paid",
      webhook_delivered: response.ok,
      tenant_id: tenantId,
      period_start: period_start,
      period_end: period_end,
    });
  } catch (error) {
    console.error("[Mark Paid] Error:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to mark as paid" },
      { status: 500 }
    );
  }
}
