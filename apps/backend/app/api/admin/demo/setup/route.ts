import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne, withTransaction } from "@truestack/shared/db";
import { generateApiKey, formatKeyForDisplay, decryptKey } from "@truestack/shared/api-keys";

const DEMO_CLIENT_CODE = "DEMO_CLIENT";
const DEMO_CLIENT_NAME = "Demo Client";

// GET /api/admin/demo/setup - Get or create demo client with API key
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if demo client exists
    let client = await queryOne<{
      id: string;
      name: string;
      code: string;
      status: string;
      created_at: string;
    }>(
      "SELECT id, name, code, status, created_at FROM client WHERE code = $1",
      [DEMO_CLIENT_CODE]
    );

    let apiKey = null;
    let creditBalance = 0;
    let isNew = false;

    if (!client) {
      // Create demo client
      isNew = true;
      const result = await withTransaction(async (txClient) => {
        // Create the demo client
        const clientResult = await txClient.query<{
          id: string;
          name: string;
          code: string;
          status: string;
          created_at: string;
        }>(
          `INSERT INTO client (name, code, contact_email, contact_phone, notes, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING id, name, code, status, created_at`,
          [
            DEMO_CLIENT_NAME,
            DEMO_CLIENT_CODE,
            "demo@truestack.com.my",
            "+60123456789",
            "Demo client for testing TrueIdentity integration",
            session.user.id,
          ]
        );

        const newClient = clientResult.rows[0];

        // Create product config (allow_overdraft enabled by default)
        // Note: webhook_url is now required per-request, not stored at client level
        await txClient.query(
          `INSERT INTO client_product_config (client_id, product_id, enabled, allow_overdraft)
           VALUES ($1, 'true_identity', true, true)`,
          [newClient.id]
        );

        // Generate API key
        const productResult = await txClient.query<{ id: string; key_prefix: string }>(
          "SELECT id, key_prefix FROM product WHERE id = 'true_identity' AND status = 'active'"
        );

        const product = productResult.rows[0];
        let generatedKey = null;

        if (product) {
          const generated = generateApiKey(product.key_prefix, "live");

          const keyResult = await txClient.query<{
            id: string;
            api_key_prefix: string;
            api_key_suffix: string;
            api_key_encrypted: string;
            environment: string;
            status: string;
            created_at: string;
          }>(
            `INSERT INTO client_api_key 
              (client_id, product_id, api_key_hash, api_key_encrypted, api_key_prefix, api_key_suffix, environment, created_by)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, api_key_prefix, api_key_suffix, api_key_encrypted, environment, status, created_at`,
            [
              newClient.id,
              product.id,
              generated.hash,
              generated.encrypted,
              generated.prefix,
              generated.suffix,
              "live",
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

        // Add initial demo credits
        await txClient.query(
          `INSERT INTO credit_ledger 
            (client_id, product_id, amount, balance_after, type, description, created_by)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            newClient.id,
            "true_identity",
            10,
            10,
            "included",
            "Initial demo credits",
            session.user.id,
          ]
        );

        return { client: newClient, apiKey: generatedKey, creditBalance: 10 };
      });

      client = result.client;
      apiKey = result.apiKey;
      creditBalance = result.creditBalance;
    } else {
      // Get existing API key
      const keyData = await queryOne<{
        id: string;
        api_key_prefix: string;
        api_key_suffix: string;
        api_key_encrypted: string;
        environment: string;
        status: string;
        created_at: string;
      }>(
        `SELECT id, api_key_prefix, api_key_suffix, api_key_encrypted, environment, status, created_at
         FROM client_api_key
         WHERE client_id = $1 AND product_id = 'true_identity' AND status = 'active'
         ORDER BY created_at DESC
         LIMIT 1`,
        [client.id]
      );

      if (keyData) {
        apiKey = {
          ...keyData,
          key: decryptKey(keyData.api_key_encrypted),
          productId: "true_identity",
          displayKey: formatKeyForDisplay(keyData.api_key_prefix, keyData.api_key_suffix),
        };
      }

      // Get current credit balance
      const balanceResult = await queryOne<{ balance: string }>(
        `SELECT COALESCE(SUM(amount), 0) as balance
         FROM credit_ledger
         WHERE client_id = $1 AND product_id = 'true_identity'`,
        [client.id]
      );

      creditBalance = parseInt(balanceResult?.balance || "0");
    }

    // Get pricing tiers for demo client
    // Credit system: 10 credits = RM 1
    const pricingTiers = await query<{
      id: string;
      tier_name: string;
      min_volume: number;
      max_volume: number | null;
      credits_per_session: number;
    }>(
      `SELECT id, tier_name, min_volume, max_volume, credits_per_session
       FROM pricing_tier
       WHERE client_id = $1 AND product_id = 'true_identity'
       ORDER BY min_volume ASC`,
      [client.id]
    );

    // Get recent sessions for demo client
    const recentSessions = await query<{
      id: string;
      ref_id: string;
      status: string;
      result: string | null;
      document_name: string;
      document_number: string;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, ref_id, status, result, document_name, document_number, created_at, updated_at
       FROM kyc_session
       WHERE client_id = $1
       ORDER BY created_at DESC
       LIMIT 20`,
      [client.id]
    );

    // Get credit ledger entries for demo client
    const creditLedger = await query<{
      id: string;
      amount: number;
      balance_after: number;
      type: string;
      reference_id: string | null;
      description: string | null;
      created_at: string;
    }>(
      `SELECT id, amount, balance_after, type, reference_id, description, created_at
       FROM credit_ledger
       WHERE client_id = $1 AND product_id = 'true_identity'
       ORDER BY created_at DESC
       LIMIT 50`,
      [client.id]
    );

    // Get allow_overdraft setting from config
    const configResult = await queryOne<{ allow_overdraft: boolean }>(
      `SELECT allow_overdraft
       FROM client_product_config
       WHERE client_id = $1 AND product_id = 'true_identity'`,
      [client.id]
    );
    const allowOverdraft = configResult?.allow_overdraft ?? true;

    // Get session statistics for debugging
    const sessionStats = await queryOne<{
      total_sessions: string;
      billed_total: string;
      billed_mtd: string;
    }>(
      `SELECT 
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE billed = true) as billed_total,
        COUNT(*) FILTER (
          WHERE billed = true
            AND updated_at >= date_trunc('month', NOW() AT TIME ZONE 'Asia/Kuala_Lumpur') AT TIME ZONE 'Asia/Kuala_Lumpur'
            AND updated_at < (date_trunc('month', NOW() AT TIME ZONE 'Asia/Kuala_Lumpur') + INTERVAL '1 month') AT TIME ZONE 'Asia/Kuala_Lumpur'
        ) as billed_mtd
       FROM kyc_session
       WHERE client_id = $1`,
      [client.id]
    );

    return NextResponse.json({
      isNew,
      client: {
        id: client.id,
        name: client.name,
        code: client.code,
        status: client.status,
        createdAt: client.created_at,
      },
      apiKey: apiKey
        ? {
            id: apiKey.id,
            key: apiKey.key,
            displayKey: apiKey.displayKey,
            environment: apiKey.environment,
            status: apiKey.status,
          }
        : null,
      creditBalance,
      allowOverdraft,
      pricingTiers,
      recentSessions,
      creditLedger,
      sessionStats: {
        totalSessions: parseInt(sessionStats?.total_sessions || "0"),
        billedTotal: parseInt(sessionStats?.billed_total || "0"),
        billedMtd: parseInt(sessionStats?.billed_mtd || "0"),
      },
    });
  } catch (error) {
    console.error("Error setting up demo client:", error);
    return NextResponse.json(
      { error: "Failed to setup demo client" },
      { status: 500 }
    );
  }
}

// POST /api/admin/demo/setup - Regenerate API key for demo client
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get demo client
    const client = await queryOne<{ id: string }>(
      "SELECT id FROM client WHERE code = $1",
      [DEMO_CLIENT_CODE]
    );

    if (!client) {
      return NextResponse.json(
        { error: "Demo client not found. Call GET first to create it." },
        { status: 404 }
      );
    }

    const result = await withTransaction(async (txClient) => {
      // Revoke existing API keys
      await txClient.query(
        `UPDATE client_api_key 
         SET status = 'revoked', revoked_at = NOW(), revoked_by = $1
         WHERE client_id = $2 AND product_id = 'true_identity' AND status = 'active'`,
        [session.user.id, client.id]
      );

      // Generate new API key
      const productResult = await txClient.query<{ id: string; key_prefix: string }>(
        "SELECT id, key_prefix FROM product WHERE id = 'true_identity' AND status = 'active'"
      );

      const product = productResult.rows[0];
      if (!product) {
        throw new Error("TrueIdentity product not found");
      }

      const generated = generateApiKey(product.key_prefix, "live");

      const keyResult = await txClient.query<{
        id: string;
        api_key_prefix: string;
        api_key_suffix: string;
        environment: string;
        status: string;
        created_at: string;
      }>(
        `INSERT INTO client_api_key 
          (client_id, product_id, api_key_hash, api_key_encrypted, api_key_prefix, api_key_suffix, environment, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, api_key_prefix, api_key_suffix, environment, status, created_at`,
        [
          client.id,
          product.id,
          generated.hash,
          generated.encrypted,
          generated.prefix,
          generated.suffix,
          "live",
          session.user.id,
        ]
      );

      return {
        id: keyResult.rows[0].id,
        key: generated.key,
        displayKey: formatKeyForDisplay(generated.prefix, generated.suffix),
        environment: keyResult.rows[0].environment,
        status: keyResult.rows[0].status,
      };
    });

    return NextResponse.json({ apiKey: result });
  } catch (error) {
    console.error("Error regenerating demo API key:", error);
    return NextResponse.json(
      { error: "Failed to regenerate API key" },
      { status: 500 }
    );
  }
}
