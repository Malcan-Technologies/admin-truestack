import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@truestack/shared/db";
import { dispatchDecisionWebhook, resolveKreditWebhookUrl } from "../../shared";

// POST /api/admin/truestack-kredit/subscription-payments/[id]/resend-webhook
// Resend the decision webhook to Kredit for approved/rejected payments where delivery failed.
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
      approved_at: string | null;
      rejected_at: string | null;
      rejection_reason: string | null;
      decided_by: string | null;
      decision_webhook_url: string | null;
      decision_webhook_delivered: boolean;
    }>(
      `SELECT id, request_id, tenant_id, plan, amount_cents, amount_myr::text, payment_reference,
              period_start::text, period_end::text, status, approved_at::text, rejected_at::text,
              rejection_reason, decided_by, decision_webhook_url, decision_webhook_delivered
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

    if (payment.status !== "approved" && payment.status !== "rejected") {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          message: "Can only resend webhook for approved or rejected payments.",
        },
        { status: 400 }
      );
    }

    if (payment.decision_webhook_delivered) {
      return NextResponse.json({
        success: true,
        message: "Webhook already delivered",
        webhook: { delivered: true },
      });
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

    const decidedAt =
      payment.status === "approved"
        ? payment.approved_at ?? new Date().toISOString()
        : payment.rejected_at ?? new Date().toISOString();

    const webhookPayload: Record<string, unknown> = {
      event: "subscription.payment.decision",
      request_id: payment.request_id,
      tenant_id: payment.tenant_id,
      status: payment.status,
      plan: payment.plan,
      amount_cents: payment.amount_cents,
      amount_myr: Number(payment.amount_myr),
      payment_reference: payment.payment_reference,
      period_start: payment.period_start.slice(0, 10),
      period_end: payment.period_end.slice(0, 10),
      decided_at:
        typeof decidedAt === "string" && decidedAt.includes("T")
          ? decidedAt
          : new Date(decidedAt).toISOString(),
      decided_by: payment.decided_by ?? session.user.id,
    };

    if (payment.status === "rejected" && payment.rejection_reason) {
      webhookPayload.rejection_reason = payment.rejection_reason;
    }

    const delivery = await dispatchDecisionWebhook(webhookUrl, webhookPayload);

    await query(
      `UPDATE kredit_subscription_payment
       SET
         decision_webhook_attempts = decision_webhook_attempts + 1,
         decision_webhook_delivered = $2,
         decision_webhook_delivered_at = CASE WHEN $2 THEN NOW() ELSE decision_webhook_delivered_at END,
         decision_webhook_last_error = $3,
         updated_at = NOW()
       WHERE id = $1`,
      [payment.id, delivery.ok, delivery.error ?? null]
    );

    return NextResponse.json({
      success: true,
      webhook: {
        delivered: delivery.ok,
        statusCode: delivery.statusCode ?? null,
        error: delivery.error ?? null,
      },
    });
  } catch (error) {
    console.error("[Resend Kredit Decision Webhook] Error:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to resend webhook" },
      { status: 500 }
    );
  }
}
