import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callKreditAdminApi } from "@/lib/kredit-admin-client";
import { signOutboundWebhook } from "@truestack/shared/hmac-webhook";

const LOCALHOST_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i;

function resolveKreditReferralWebhookUrl(): string | null {
  const fallbackPath = "/api/webhooks/kredit/referral-paid";
  const configuredBase = process.env.KREDIT_BACKEND_URL?.trim() || "";

  if (!configuredBase) return null;
  return `${configuredBase.replace(/\/$/, "")}${fallbackPath}`;
}

async function dispatchReferralPaidWebhook(
  webhookUrl: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; statusCode?: number; error?: string }> {
  const rawBody = JSON.stringify(payload);
  const outboundSecret =
    process.env.TRUEIDENTITY_WEBHOOK_SECRET || process.env.KREDIT_WEBHOOK_SECRET || "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-TrueStack-Event": "referral.paid",
  };

  if (outboundSecret) {
    const { signature, timestamp } = signOutboundWebhook(rawBody, outboundSecret);
    headers["x-trueidentity-signature"] = signature;
    headers["x-trueidentity-timestamp"] = timestamp;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: rawBody,
    });
    if (!response.ok) {
      const bodyText = await response.text().catch(() => "");
      return {
        ok: false,
        statusCode: response.status,
        error: bodyText ? `HTTP ${response.status}: ${bodyText}` : `HTTP ${response.status}`,
      };
    }
    return { ok: true, statusCode: response.status };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Webhook dispatch failed",
    };
  }
}

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

    // First fetch the referral details from Kredit to verify it exists and get referrer info
    const referralData = await callKreditAdminApi<{
      success: boolean;
      data?: {
        referrals?: Array<{
          id: string;
          referrer: { id: string };
          isEligible: boolean;
          isPaid: boolean;
        }>;
      };
    }>({
      endpoint: `/api/internal/kredit/admin/referrals`,
      searchParams: new URLSearchParams({ page: "1", pageSize: "100" }),
    });

    // Find the referral in the list
    const referrals = referralData.data?.referrals || [];
    const referral = referrals.find((r) => r.id === id);

    if (!referral) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Referral not found" },
        { status: 404 }
      );
    }

    if (referral.isPaid) {
      return NextResponse.json({
        success: true,
        message: "Already marked as paid",
        idempotent: true,
      });
    }

    if (!referral.isEligible) {
      return NextResponse.json(
        { error: "CONFLICT", message: "Referral is not eligible for payout" },
        { status: 409 }
      );
    }

    const webhookUrl = resolveKreditReferralWebhookUrl();
    if (!webhookUrl) {
      return NextResponse.json(
        {
          error: "CONFIG_ERROR",
          message: "Unable to resolve Kredit referral webhook URL. Set KREDIT_BACKEND_URL.",
        },
        { status: 500 }
      );
    }

    const paidAt = new Date();
    const webhookPayload = {
      event: "referral.paid",
      referral_id: id,
      referrer_user_id: referral.referrer.id,
      paid: true,
      paid_at: paidAt.toISOString(),
      decided_by: session.user.id,
    };

    const delivery = await dispatchReferralPaidWebhook(webhookUrl, webhookPayload);

    return NextResponse.json({
      success: true,
      data: {
        id,
        isPaid: true,
        paidAt: paidAt.toISOString(),
      },
      webhook: {
        delivered: delivery.ok,
        statusCode: delivery.statusCode ?? null,
        error: delivery.error ?? null,
      },
    });
  } catch (error) {
    console.error("[Mark Kredit Referral Paid] Error:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to mark referral as paid" },
      { status: 500 }
    );
  }
}
