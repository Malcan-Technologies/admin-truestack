import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, withTransaction } from "@truestack/shared/db";
import { createInnovatifTransaction } from "@truestack/shared/innovatif";
import { verifyKreditWebhookSignature } from "@truestack/shared/hmac-webhook";
import crypto from "crypto";

const KREDIT_WEBHOOK_SECRET = process.env.KREDIT_WEBHOOK_SECRET || "";
const TRUESTACK_KREDIT_PARENT_CODE = "TRUESTACK_KREDIT";

const LOCALHOST_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i;

/** For truestack_kredit: when webhook_url is localhost, use KREDIT_BACKEND_URL + path instead */
function resolveKreditWebhookUrl(webhookUrl: string): string {
  if (!LOCALHOST_PATTERN.test(webhookUrl)) return webhookUrl;
  const kreditBackend = process.env.KREDIT_BACKEND_URL?.trim();
  if (!kreditBackend) return webhookUrl;
  try {
    const parsed = new URL(webhookUrl);
    const path = parsed.pathname + parsed.search;
    return `${kreditBackend.replace(/\/$/, "")}${path || "/api/webhooks/trueidentity"}`;
  } catch {
    return webhookUrl;
  }
}

function generateRefId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = crypto.randomBytes(4).toString("hex");
  return `${prefix}_${timestamp}_${random}`.substring(0, 32);
}

// POST /api/webhooks/kredit/verification-request
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-kredit-signature");
    const timestamp = request.headers.get("x-kredit-timestamp");

    if (!KREDIT_WEBHOOK_SECRET) {
      console.error("[Kredit Webhook] KREDIT_WEBHOOK_SECRET not configured");
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
      // Safe debug: no secrets or signature values, only lengths for comparing with Kredit
      console.warn("[Kredit Webhook] Signature verification failed:", verification.error, {
        bodyLength: rawBody.length,
        timestamp: timestamp ?? "(missing)",
        signatureLength: signature?.length ?? 0,
      });
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: verification.error || "Invalid signature" },
        { status: 401 }
      );
    }

    let body: {
      tenant_id: string;
      tenant_slug?: string;
      borrower_id: string;
      document_name: string;
      document_number: string;
      document_type?: string;
      borrower_email?: string;
      webhook_url: string;
      metadata?: Record<string, unknown>;
    };

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "Invalid JSON body" },
        { status: 400 }
      );
    }

    const {
      tenant_id,
      tenant_slug,
      borrower_id,
      document_name,
      document_number,
      document_type = "1",
      webhook_url,
      metadata = {},
    } = body;

    if (!tenant_id || !document_name || !document_number) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "tenant_id, document_name, and document_number are required" },
        { status: 400 }
      );
    }

    if (!webhook_url) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "webhook_url is required for status callbacks" },
        { status: 400 }
      );
    }

    let resolvedWebhookUrl: string;

    // Path-only (e.g. "/api/webhooks/trueidentity"): Admin prepends KREDIT_BACKEND_URL
    if (webhook_url.startsWith("/")) {
      const kreditBackend = process.env.KREDIT_BACKEND_URL?.trim();
      if (!kreditBackend) {
        return NextResponse.json(
          {
            error: "BAD_REQUEST",
            message:
              "Path-only webhook_url requires KREDIT_BACKEND_URL in Admin. Send a full URL or set KREDIT_BACKEND_URL.",
          },
          { status: 400 }
        );
      }
      resolvedWebhookUrl = `${kreditBackend.replace(/\/$/, "")}${webhook_url}`;
    } else {
      try {
        new URL(webhook_url);
      } catch {
        return NextResponse.json(
          { error: "BAD_REQUEST", message: "webhook_url must be a valid HTTP/HTTPS URL" },
          { status: 400 }
        );
      }
      // For truestack_kredit: Admin uses KREDIT_BACKEND_URL when Kredit sends localhost
      resolvedWebhookUrl = resolveKreditWebhookUrl(webhook_url);
    }

    if (
      process.env.NODE_ENV === "production" &&
      LOCALHOST_PATTERN.test(resolvedWebhookUrl)
    ) {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          message:
            "webhook_url cannot be localhost in production. Set KREDIT_BACKEND_URL in Admin or use a production URL in Kredit.",
        },
        { status: 400 }
      );
    }

    const slug = tenant_slug ?? tenant_id;

    // Resolve tenant by kredit_tenant_id (backend lookup key)
    const parentClient = await queryOne<{ id: string }>(
      `SELECT id FROM client 
       WHERE code = $1 AND client_type = 'parent' AND client_source = 'truestack_kredit' AND status = 'active'`,
      [TRUESTACK_KREDIT_PARENT_CODE]
    );

    if (!parentClient) {
      console.error("[Kredit Webhook] TrueStack Kredit parent client not found");
      return NextResponse.json(
        { error: "CONFIG_ERROR", message: "Kredit parent client not configured" },
        { status: 503 }
      );
    }

    let tenantClient = await queryOne<{
      id: string;
      code: string;
      status: string;
    }>(
      `SELECT id, code, status FROM client 
       WHERE parent_client_id = $1 AND (kredit_tenant_id = $2 OR tenant_slug = $3) AND status = 'active'`,
      [parentClient.id, tenant_id, slug]
    );

    // Auto-create tenant on first verification request if not found
    if (!tenantClient) {
      const codeBase = `TK_${slug.replace(/[^a-zA-Z0-9_-]/g, "_").toUpperCase()}`;
      let finalCode = codeBase;
      let suffix = 0;
      while (true) {
        const exists = await queryOne<{ id: string }>(
          "SELECT id FROM client WHERE code = $1",
          [finalCode]
        );
        if (!exists) break;
        finalCode = `${codeBase}_${++suffix}`;
      }

      const name = `Kredit Tenant ${slug}`;
      let inserted: { id: string; code: string; status: string } | null = null;

      try {
        inserted = await withTransaction(async (txClient) => {
          const insertResult = await txClient.query(
            `INSERT INTO client 
              (name, code, client_type, client_source, parent_client_id, tenant_slug, kredit_tenant_id,
               contact_email, contact_phone, company_registration, status)
             VALUES ($1, $2, 'tenant', 'truestack_kredit', $3, $4, $5, NULL, NULL, NULL, 'active')
             RETURNING id, code, status`,
            [name, finalCode, parentClient.id, slug, tenant_id]
          );
          const row = insertResult.rows[0] as { id: string; code: string; status: string };

          await txClient.query(
            `INSERT INTO client_product_config (client_id, product_id, enabled, allow_overdraft, webhook_url)
             VALUES ($1, 'true_identity', true, true, $2)`,
            [row.id, resolvedWebhookUrl]
          );
          await txClient.query(
            `INSERT INTO pricing_tier 
              (client_id, product_id, tier_name, min_volume, max_volume, credits_per_session)
             VALUES ($1, 'true_identity', 'Default', 1, NULL, 40)`,
            [row.id]
          );
          return row;
        });
      } catch (err: unknown) {
        const pgErr = err as { code?: string };
        if (pgErr?.code !== "23505") throw err; // 23505 = unique_violation
        // Race: another request created the tenant
      }

      if (inserted) {
        tenantClient = inserted;
        console.info("[Kredit Webhook] Auto-created tenant client:", tenant_id);
      } else {
        // Race: another request created the tenant; fetch and ensure config/tier exist
        tenantClient = await queryOne<{ id: string; code: string; status: string }>(
          `SELECT id, code, status FROM client 
           WHERE parent_client_id = $1 AND (kredit_tenant_id = $2 OR tenant_slug = $3) AND status = 'active'`,
          [parentClient.id, tenant_id, slug]
        );
        if (tenantClient) {
          try {
            await query(
              `INSERT INTO client_product_config (client_id, product_id, enabled, allow_overdraft, webhook_url)
               VALUES ($1, 'true_identity', true, true, $2)`,
              [tenantClient.id, resolvedWebhookUrl]
            );
          } catch (e: unknown) {
            if ((e as { code?: string })?.code !== "23505") throw e;
          }
          try {
            await query(
              `INSERT INTO pricing_tier 
                (client_id, product_id, tier_name, min_volume, max_volume, credits_per_session)
               VALUES ($1, 'true_identity', 'Default', 1, NULL, 40)`,
              [tenantClient.id]
            );
          } catch (e: unknown) {
            if ((e as { code?: string })?.code !== "23505") throw e;
          }
        }
      }

      if (!tenantClient) {
        return NextResponse.json(
          {
            error: "NOT_FOUND",
            message: `Tenant not found: ${tenant_id}. Ensure the tenant exists in Admin (e.g. via tenant-created webhook).`,
          },
          { status: 404 }
        );
      }
    }

    // Get product config for credit check
    const config = await queryOne<{ enabled: boolean; allow_overdraft: boolean }>(
      `SELECT enabled, allow_overdraft FROM client_product_config 
       WHERE client_id = $1 AND product_id = 'true_identity'`,
      [tenantClient.id]
    );

    if (!config?.enabled) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "TrueIdentity not enabled for this tenant" },
        { status: 403 }
      );
    }

    // Check credits
    const balanceResult = await queryOne<{ balance: string }>(
      `SELECT COALESCE(SUM(amount), 0) as balance 
       FROM credit_ledger 
       WHERE client_id = $1 AND product_id = 'true_identity'`,
      [tenantClient.id]
    );
    const currentBalance = parseInt(balanceResult?.balance || "0", 10);

    // Select tier by current billed volume: next session = billed_count + 1
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const billedCountResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM kyc_session ks
       JOIN credit_ledger cl ON cl.reference_id = ks.id AND cl.type = 'usage' AND cl.product_id = 'true_identity'
       WHERE ks.client_id = $1 AND ks.billed = true 
         AND ks.billed_at >= $2 AND ks.billed_at <= $3`,
      [tenantClient.id, periodStart.toISOString(), periodEnd.toISOString()]
    );
    const billedCount = parseInt(billedCountResult?.count || "0", 10);
    const nextSessionNum = billedCount + 1;

    const tierResult = await queryOne<{ credits_per_session: number }>(
      `SELECT credits_per_session FROM pricing_tier 
       WHERE client_id = $1 AND product_id = 'true_identity' 
         AND min_volume <= $2 AND (max_volume IS NULL OR max_volume >= $2)
       ORDER BY min_volume DESC LIMIT 1`,
      [tenantClient.id, nextSessionNum]
    );
    const minCredits = tierResult?.credits_per_session ?? 40; // RM 4 = 40 credits

    if (currentBalance < minCredits && !config.allow_overdraft) {
      return NextResponse.json(
        {
          error: "INSUFFICIENT_CREDITS",
          message: "Insufficient credits for this tenant",
          balance: currentBalance,
        },
        { status: 402 }
      );
    }

    const refId = generateRefId(tenantClient.code.substring(0, 8));

    const sessionMetadata = {
      tenant_id,
      borrower_id,
      source: "truestack_kredit",
      ...metadata,
    };

    const session = await queryOne<{ id: string; ref_id: string; created_at: string }>(
      `INSERT INTO kyc_session 
        (client_id, ref_id, document_name, document_number, document_type, platform, 
         webhook_url, metadata, expires_at)
       VALUES ($1, $2, $3, $4, $5, 'Web', $6, $7, NOW() + INTERVAL '24 hours')
       RETURNING id, ref_id, created_at`,
      [
        tenantClient.id,
        refId,
        document_name,
        document_number.replace(/-/g, ""),
        document_type,
        resolvedWebhookUrl,
        JSON.stringify(sessionMetadata),
      ]
    );

    if (!session) {
      return NextResponse.json(
        { error: "SERVER_ERROR", message: "Failed to create session" },
        { status: 500 }
      );
    }

    const backendUrl = process.env.BETTER_AUTH_URL || "http://localhost:3001";
    const coreUrl = process.env.CORE_APP_URL || "http://localhost:3000";

    try {
      const innovatifResult = await createInnovatifTransaction(
        {
          refId,
          documentName: document_name,
          documentNumber: document_number.replace(/-/g, ""),
          documentType: document_type,
          sessionId: session.id,
          platform: "Web",
        },
        backendUrl,
        coreUrl,
        undefined
      );

      await query(
        `UPDATE kyc_session 
         SET innovatif_onboarding_id = $1, innovatif_ref_id = $2, status = 'pending'
         WHERE id = $3`,
        [innovatifResult.onboardingId, innovatifResult.innovatifRefId || null, session.id]
      );

      return NextResponse.json(
        {
          session_id: session.id,
          onboarding_url: innovatifResult.onboardingUrl,
          status: "pending",
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        },
        { status: 200 }
      );
    } catch (innovatifError) {
      console.error("[Kredit Webhook] Innovatif API error:", innovatifError);
      await query(
        `UPDATE kyc_session SET status = 'expired', result = 'rejected', reject_message = $1 WHERE id = $2`,
        [
          innovatifError instanceof Error ? innovatifError.message : "Innovatif API error",
          session.id,
        ]
      );
      const msg =
        innovatifError instanceof Error ? innovatifError.message : "Verification provider error";
      return NextResponse.json(
        { error: "GATEWAY_ERROR", message: msg.startsWith("Innovatif: ") ? msg.slice(11) : msg },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("[Kredit Webhook] Error:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}
