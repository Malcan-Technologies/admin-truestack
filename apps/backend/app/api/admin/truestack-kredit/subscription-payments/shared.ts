import { signOutboundWebhook } from "@truestack/shared/hmac-webhook";

const LOCALHOST_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i;

export function resolveKreditWebhookUrl(rawUrl: string | null): string | null {
  const fallbackPath = "/api/webhooks/kredit/subscription-payment-decision";
  const incoming = (rawUrl || "").trim();
  const configuredBase = process.env.KREDIT_BACKEND_URL?.trim() || "";

  if (!incoming) {
    if (!configuredBase) return null;
    return `${configuredBase.replace(/\/$/, "")}${fallbackPath}`;
  }

  if (incoming.startsWith("/")) {
    if (!configuredBase) return null;
    return `${configuredBase.replace(/\/$/, "")}${incoming}`;
  }

  try {
    const parsed = new URL(incoming);
    if (LOCALHOST_PATTERN.test(incoming) && configuredBase) {
      const path = parsed.pathname + parsed.search;
      return `${configuredBase.replace(/\/$/, "")}${path || fallbackPath}`;
    }
    return incoming;
  } catch {
    return null;
  }
}

export async function dispatchDecisionWebhook(
  webhookUrl: string,
  payload: Record<string, unknown>
): Promise<{ ok: boolean; statusCode?: number; error?: string }> {
  const rawBody = JSON.stringify(payload);
  const outboundSecret =
    process.env.TRUEIDENTITY_WEBHOOK_SECRET || process.env.KREDIT_WEBHOOK_SECRET || "";
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-TrueStack-Event": "subscription.payment.decision",
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
