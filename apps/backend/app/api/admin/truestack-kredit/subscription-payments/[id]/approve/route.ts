import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@truestack/shared/db";
import { dispatchDecisionWebhook, resolveKreditWebhookUrl } from "../../shared";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const payment = await queryOne<{
      id: string;
      request_id: string;
      tenant_id: string;
      plan: string;
      amount_cents: number;
      amount_myr: string;
      payment_reference: string;
      period_start: string;
      period_end: string;
      status: string;
      decision_webhook_url: string | null;
      decision_webhook_attempts: number;
    }>(
      `SELECT id, request_id, tenant_id, plan, amount_cents, amount_myr::text, payment_reference,
              period_start::text, period_end::text, status, decision_webhook_url, decision_webhook_attempts
       FROM kredit_subscription_payment
       WHERE id = $1`,
      [id]
    );

    if (!payment) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Subscription payment request not found" },
        { status: 404 }
      );
    }

    if (payment.status === "approved") {
      return NextResponse.json({
        success: true,
        message: "Already approved",
        idempotent: true,
      });
    }

    if (payment.status === "rejected") {
      return NextResponse.json(
        { error: "CONFLICT", message: "Request is already rejected and cannot be approved" },
        { status: 409 }
      );
    }

    const webhookUrl = resolveKreditWebhookUrl(payment.decision_webhook_url);
    if (!webhookUrl) {
      return NextResponse.json(
        {
          error: "CONFIG_ERROR",
          message:
            "Unable to resolve Kredit decision webhook URL. Set KREDIT_BACKEND_URL or provide decision_webhook_url.",
        },
        { status: 500 }
      );
    }

    const decidedAt = new Date();
    const webhookPayload = {
      event: "subscription.payment.decision",
      request_id: payment.request_id,
      tenant_id: payment.tenant_id,
      status: "approved",
      plan: payment.plan,
      amount_cents: payment.amount_cents,
      amount_myr: Number(payment.amount_myr),
      payment_reference: payment.payment_reference,
      period_start: payment.period_start.slice(0, 10),
      period_end: payment.period_end.slice(0, 10),
      decided_at: decidedAt.toISOString(),
      decided_by: session.user.id,
    };

    const delivery = await dispatchDecisionWebhook(webhookUrl, webhookPayload);

    const updated = await query<{
      id: string;
      status: string;
      approved_at: string | null;
      decision_webhook_delivered: boolean;
      decision_webhook_attempts: number;
      decision_webhook_last_error: string | null;
    }>(
      `UPDATE kredit_subscription_payment
       SET
         status = 'approved',
         approved_at = COALESCE(approved_at, $2::timestamp),
         rejected_at = NULL,
         rejection_reason = NULL,
         decided_by = $3,
         decision_webhook_attempts = decision_webhook_attempts + 1,
         decision_webhook_delivered = $4,
         decision_webhook_delivered_at = CASE WHEN $4 THEN $2::timestamp ELSE decision_webhook_delivered_at END,
         decision_webhook_last_error = $5,
         updated_at = NOW()
       WHERE id = $1
       RETURNING id, status, approved_at::text, decision_webhook_delivered, decision_webhook_attempts, decision_webhook_last_error`,
      [payment.id, decidedAt.toISOString(), session.user.id, delivery.ok, delivery.error ?? null]
    );

    return NextResponse.json({
      success: true,
      data: updated[0],
      webhook: {
        delivered: delivery.ok,
        statusCode: delivery.statusCode ?? null,
        error: delivery.error ?? null,
      },
    });
  } catch (error) {
    console.error("[Approve Kredit Subscription Payment] Error:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to approve subscription payment" },
      { status: 500 }
    );
  }
}
