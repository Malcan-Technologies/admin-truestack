import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne, withTransaction } from "@truestack/shared/db";
import { generateApiKey, formatKeyForDisplay } from "@truestack/shared/api-keys";

// GET /api/admin/clients - List all clients
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const clients = await query<{
      id: string;
      name: string;
      code: string;
      contact_email: string | null;
      contact_phone: string | null;
      company_registration: string | null;
      status: string;
      notes: string | null;
      created_at: string;
      updated_at: string;
      client_source: string | null;
      client_type: string | null;
      parent_client_id: string | null;
      parent_client_name: string | null;
      tenant_slug: string | null;
      credit_balance: number;
      sessions_count: number;
      billed_total: number;
      billed_mtd: number;
      unpaid_invoice_count: number;
      unpaid_amount_credits: number;
      has_overdue_invoice: boolean;
      oldest_overdue_days: number | null;
    }>(`
      SELECT 
        c.id,
        c.name,
        c.code,
        c.contact_email,
        c.contact_phone,
        c.company_registration,
        c.status,
        c.notes,
        c.created_at,
        c.updated_at,
        COALESCE(c.client_source, 'api') as client_source,
        COALESCE(c.client_type, 'direct') as client_type,
        c.parent_client_id,
        parent.name as parent_client_name,
        c.tenant_slug,
        COALESCE((
          SELECT balance_after FROM credit_ledger 
          WHERE client_id = c.id AND product_id = 'true_identity'
          ORDER BY created_at DESC LIMIT 1
        ), 0) as credit_balance,
        COALESCE((
          SELECT COUNT(*) FROM kyc_session 
          WHERE client_id = c.id
        ), 0) as sessions_count,
        COALESCE((
          SELECT COUNT(*) FROM kyc_session 
          WHERE client_id = c.id AND billed = true
        ), 0) as billed_total,
        COALESCE((
          SELECT COUNT(*) FROM kyc_session 
          WHERE client_id = c.id 
            AND billed = true
            AND billed_at >= date_trunc('month', NOW() AT TIME ZONE 'Asia/Kuala_Lumpur') AT TIME ZONE 'Asia/Kuala_Lumpur'
            AND billed_at < (date_trunc('month', NOW() AT TIME ZONE 'Asia/Kuala_Lumpur') + INTERVAL '1 month') AT TIME ZONE 'Asia/Kuala_Lumpur'
        ), 0) as billed_mtd,
        COALESCE(unpaid.count, 0) as unpaid_invoice_count,
        COALESCE(unpaid.total, 0) as unpaid_amount_credits,
        COALESCE(unpaid.has_overdue, false) as has_overdue_invoice,
        unpaid.oldest_overdue_days
      FROM client c
      LEFT JOIN client parent ON parent.id = c.parent_client_id
      LEFT JOIN (
        SELECT 
          client_id, 
          COUNT(*) as count,
          SUM(amount_due_credits - amount_paid_credits) as total,
          BOOL_OR(due_date < CURRENT_DATE) as has_overdue,
          MAX(CASE WHEN due_date < CURRENT_DATE 
              THEN CURRENT_DATE - due_date 
              ELSE NULL END) as oldest_overdue_days
        FROM invoice 
        WHERE status IN ('generated', 'partial')
        GROUP BY client_id
      ) unpaid ON unpaid.client_id = c.id
      ORDER BY c.created_at DESC
    `);

    return NextResponse.json(clients);
  } catch (error) {
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

// POST /api/admin/clients - Create a new client
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      name, 
      code, 
      contactEmail, 
      contactPhone, 
      companyRegistration, 
      notes, 
      initialCredits,
      initialCreditsType = "included",
      generateApiKey: shouldGenerateApiKey = false,
      apiKeyEnvironment = "live",
      allowOverdraft = true,
      pricingTiers = [],
    } = body;

    // Validate required fields
    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    if (!contactEmail) {
      return NextResponse.json(
        { error: "Contact email is required" },
        { status: 400 }
      );
    }

    if (!contactPhone) {
      return NextResponse.json(
        { error: "Contact phone is required" },
        { status: 400 }
      );
    }

    if (!companyRegistration) {
      return NextResponse.json(
        { error: "Company registration (SSM) is required" },
        { status: 400 }
      );
    }

    // Validate code format
    if (!/^[A-Z0-9_]+$/.test(code)) {
      return NextResponse.json(
        { error: "Code must contain only uppercase letters, numbers, and underscores" },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = await queryOne<{ id: string }>(
      "SELECT id FROM client WHERE code = $1",
      [code]
    );

    if (existing) {
      return NextResponse.json(
        { error: "A client with this code already exists" },
        { status: 409 }
      );
    }

    // Use transaction to ensure atomicity when creating client with initial credits and API key
    const result = await withTransaction(async (txClient) => {
      // Create client (UUID auto-generated by database default)
      const clientResult = await txClient.query<{
        id: string;
        name: string;
        code: string;
        contact_email: string | null;
        contact_phone: string | null;
        company_registration: string | null;
        status: string;
        notes: string | null;
        created_at: string;
      }>(
        `INSERT INTO client (name, code, contact_email, contact_phone, company_registration, notes, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, name, code, contact_email, contact_phone, company_registration, status, notes, created_at`,
        [name, code, contactEmail, contactPhone, companyRegistration, notes || null, session.user.id]
      );

      const newClient = clientResult.rows[0];

      // Create TrueIdentity product config for this client with allow_overdraft setting
      await txClient.query(
        `INSERT INTO client_product_config (client_id, product_id, enabled, allow_overdraft)
         VALUES ($1, 'true_identity', true, $2)`,
        [newClient.id, allowOverdraft]
      );

      // Create pricing tiers if provided
      // Credit system: 10 credits = RM 1
      if (Array.isArray(pricingTiers) && pricingTiers.length > 0) {
        for (let i = 0; i < pricingTiers.length; i++) {
          const tier = pricingTiers[i];
          const tierName = tier.tierName || `Tier ${i + 1}`;
          await txClient.query(
            `INSERT INTO pricing_tier 
              (client_id, product_id, tier_name, min_volume, max_volume, credits_per_session)
             VALUES ($1, 'true_identity', $2, $3, $4, $5)`,
            [
              newClient.id,
              tierName,
              tier.minVolume || 1, // 1-indexed: first session = 1
              tier.maxVolume || null,
              tier.creditsPerSession || 50, // Default 50 credits (RM 5)
            ]
          );
        }
      }

      // Add initial credits if specified
      const creditType = ["included", "topup"].includes(initialCreditsType) ? initialCreditsType : "included";
      if (initialCredits && typeof initialCredits === "number" && initialCredits > 0) {
        await txClient.query(
          `INSERT INTO credit_ledger 
            (client_id, product_id, amount, balance_after, type, description, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            newClient.id,
            "true_identity",
            initialCredits,
            initialCredits,
            creditType,
            creditType === "included" ? "Initial credits included with account" : "Initial top-up",
            session.user.id,
          ]
        );
      }

      // Generate API key if requested
      let generatedKey = null;
      if (shouldGenerateApiKey) {
        // Get product details
        const productResult = await txClient.query<{ id: string; key_prefix: string }>(
          "SELECT id, key_prefix FROM product WHERE id = 'true_identity' AND status = 'active'"
        );
        
        const product = productResult.rows[0];
        if (product) {
          const env = apiKeyEnvironment === "test" ? "test" : "live";
          const generated = generateApiKey(product.key_prefix, env);

          const keyResult = await txClient.query<{
            id: string;
            api_key_prefix: string;
            api_key_suffix: string;
            environment: string;
            created_at: string;
          }>(
            `INSERT INTO client_api_key 
              (client_id, product_id, api_key_hash, api_key_encrypted, api_key_prefix, api_key_suffix, environment, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, api_key_prefix, api_key_suffix, environment, created_at`,
            [
              newClient.id,
              product.id,
              generated.hash,
              generated.encrypted,
              generated.prefix,
              generated.suffix,
              env,
              session.user.id,
            ]
          );

          generatedKey = {
            ...keyResult.rows[0],
            key: generated.key,
            productId: product.id,
            displayKey: formatKeyForDisplay(generated.prefix, generated.suffix),
          };
        }
      }

      return { client: newClient, apiKey: generatedKey };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error creating client:", error);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
