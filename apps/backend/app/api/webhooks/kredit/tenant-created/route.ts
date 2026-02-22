import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, withTransaction } from "@truestack/shared/db";
import { verifyKreditWebhookSignature } from "@truestack/shared/hmac-webhook";

const KREDIT_WEBHOOK_SECRET = process.env.KREDIT_WEBHOOK_SECRET || "";
const TRUESTACK_KREDIT_PARENT_CODE = "TRUESTACK_KREDIT";

// POST /api/webhooks/kredit/tenant-created
// Called by Kredit when a tenant pays for the first time (Core + TrueIdentity).
// Auto-creates the tenant client in Admin with idempotency.
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-kredit-signature");
    const timestamp = request.headers.get("x-kredit-timestamp");

    if (!KREDIT_WEBHOOK_SECRET) {
      console.error("[Kredit Tenant Created] KREDIT_WEBHOOK_SECRET not configured");
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
      console.warn("[Kredit Tenant Created] Signature verification failed:", verification.error);
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: verification.error || "Invalid signature" },
        { status: 401 }
      );
    }

    let body: {
      tenant_id: string;
      tenant_slug?: string;
      tenant_name?: string;
      contact_email?: string;
      contact_phone?: string;
      company_registration?: string;
      webhook_url?: string;
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
      tenant_name,
      contact_email,
      contact_phone,
      company_registration,
      webhook_url,
      metadata = {},
    } = body;

    if (!tenant_id) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "tenant_id is required" },
        { status: 400 }
      );
    }
    const slug = tenant_slug ?? tenant_id;

    if (
      webhook_url &&
      process.env.NODE_ENV === "production" &&
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(webhook_url)
    ) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "webhook_url cannot be localhost in production" },
        { status: 400 }
      );
    }

    const parentClient = await queryOne<{ id: string }>(
      `SELECT id FROM client 
       WHERE code = $1 AND client_type = 'parent' AND client_source = 'truestack_kredit' AND status = 'active'`,
      [TRUESTACK_KREDIT_PARENT_CODE]
    );

    if (!parentClient) {
      console.error("[Kredit Tenant Created] TrueStack Kredit parent client not found");
      return NextResponse.json(
        { error: "CONFIG_ERROR", message: "Kredit parent client not configured" },
        { status: 503 }
      );
    }

    // Idempotency: check if tenant already exists (by kredit_tenant_id or tenant_slug)
    const existingTenant = await queryOne<{
      id: string;
      name: string;
      code: string;
      tenant_slug: string | null;
    }>(
      `SELECT id, name, code, tenant_slug FROM client 
       WHERE parent_client_id = $1 AND (kredit_tenant_id = $2 OR tenant_slug = $3) AND status != 'deleted'`,
      [parentClient.id, tenant_id, slug]
    );

    if (existingTenant) {
      return NextResponse.json({
        created: false,
        client_id: existingTenant.id,
        tenant_id: tenant_id,
        message: "Tenant already exists",
      });
    }

    const name = tenant_name || `Kredit Tenant ${slug}`;
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

    const newClient = await withTransaction(async (txClient) => {
      const insertResult = await txClient.query(
        `INSERT INTO client 
          (name, code, client_type, client_source, parent_client_id, tenant_slug, kredit_tenant_id,
           contact_email, contact_phone, company_registration, status)
         VALUES ($1, $2, 'tenant', 'truestack_kredit', $3, $4, $5, $6, $7, $8, 'active')
         RETURNING id, name, code, tenant_slug`,
        [
          name,
          finalCode,
          parentClient.id,
          slug,
          tenant_id,
          contact_email || null,
          contact_phone || null,
          company_registration || null,
        ]
      );

      const row = insertResult.rows[0] as {
        id: string;
        name: string;
        code: string;
        tenant_slug: string;
      };

      await txClient.query(
        `INSERT INTO client_product_config (client_id, product_id, enabled, allow_overdraft, webhook_url)
         VALUES ($1, 'true_identity', true, true, $2)`,
        [row.id, webhook_url || null]
      );

      await txClient.query(
        `INSERT INTO pricing_tier 
          (client_id, product_id, tier_name, min_volume, max_volume, credits_per_session)
         VALUES ($1, 'true_identity', 'Default', 1, NULL, 40)`,
        [row.id]
      );

      return row;
    });

    return NextResponse.json({
      created: true,
      client_id: newClient.id,
      tenant_id: tenant_id,
      code: newClient.code,
      name: newClient.name,
      message: "Tenant client created",
    });
  } catch (error) {
    console.error("[Kredit Tenant Created] Error:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Failed to create tenant" },
      { status: 500 }
    );
  }
}
