import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, withTransaction } from "@truestack/shared/db";
import { hashApiKey } from "@truestack/shared/api-keys";
import { createInnovatifTransaction } from "@truestack/shared/innovatif";
import crypto from "crypto";

// Helper to extract API key from Authorization header
function extractApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

// Helper to validate API key and get client info
async function validateApiKeyAndGetClient(apiKey: string) {
  const hash = hashApiKey(apiKey);
  
  const keyData = await queryOne<{
    id: string;
    client_id: string;
    product_id: string;
    status: string;
  }>(
    `SELECT id, client_id, product_id, status 
     FROM client_api_key 
     WHERE api_key_hash = $1 AND status = 'active'`,
    [hash]
  );

  if (!keyData) {
    return null;
  }

  // Get client details and config
  const client = await queryOne<{
    id: string;
    code: string;
    status: string;
  }>(
    `SELECT id, code, status FROM client WHERE id = $1`,
    [keyData.client_id]
  );

  if (!client || client.status !== "active") {
    return null;
  }

  // Get product config
  const config = await queryOne<{
    enabled: boolean;
    webhook_url: string | null;
    success_url: string | null;
    fail_url: string | null;
    allow_overdraft: boolean;
  }>(
    `SELECT enabled, webhook_url, success_url, fail_url, allow_overdraft
     FROM client_product_config
     WHERE client_id = $1 AND product_id = $2`,
    [client.id, keyData.product_id]
  );

  if (!config?.enabled) {
    return null;
  }

  return {
    clientId: client.id,
    clientCode: client.code,
    productId: keyData.product_id,
    config,
  };
}

// Helper to check if client has sufficient credits (no deduction - billing happens on completion)
async function checkCredits(
  clientId: string,
  productId: string,
  allowOverdraft: boolean
): Promise<{ success: boolean; balance: number; minPrice: number; error?: string }> {
  // Get current balance
  const balanceResult = await queryOne<{ balance: string }>(
    `SELECT COALESCE(SUM(amount), 0) as balance 
     FROM credit_ledger 
     WHERE client_id = $1 AND product_id = $2`,
    [clientId, productId]
  );

  const currentBalance = parseFloat(balanceResult?.balance || "0");

  // Get current month's usage to determine applicable tier
  const usageResult = await queryOne<{ count: string }>(
    `SELECT COUNT(*) as count 
     FROM kyc_session 
     WHERE client_id = $1 
       AND billed = true
       AND created_at >= date_trunc('month', CURRENT_DATE)
       AND created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'`,
    [clientId]
  );
  const currentMonthUsage = parseInt(usageResult?.count || "0");

  // Get the applicable pricing tier based on current usage
  const tierResult = await queryOne<{ price_per_unit: string }>(
    `SELECT price_per_unit
     FROM pricing_tier
     WHERE client_id = $1 
       AND product_id = $2
       AND min_volume <= $3
       AND (max_volume IS NULL OR max_volume >= $3)
     ORDER BY min_volume DESC
     LIMIT 1`,
    [clientId, productId, currentMonthUsage + 1]
  );

  // Default to 1 credit if no pricing tier is configured
  const minPrice = tierResult ? parseFloat(tierResult.price_per_unit) : 1;

  // Check if sufficient credits (unless overdraft allowed)
  if (currentBalance < minPrice && !allowOverdraft) {
    return {
      success: false,
      balance: currentBalance,
      minPrice,
      error: `Insufficient credits. Need ${minPrice} credits, have ${currentBalance}`,
    };
  }

  return { success: true, balance: currentBalance, minPrice };
}

// Generate unique ref_id for Innovatif (max 32 characters)
function generateRefId(clientCode: string): string {
  // Use base36 timestamp (shorter) + random hex
  // Format: {shortCode}_{base36timestamp}_{random} = max 32 chars
  const shortCode = clientCode.substring(0, 8); // Max 8 chars from client code
  const timestamp = Date.now().toString(36); // Base36 = ~8 chars
  const random = crypto.randomBytes(4).toString("hex"); // 8 chars
  const refId = `${shortCode}_${timestamp}_${random}`;
  
  // Ensure max 32 characters
  return refId.substring(0, 32);
}

// POST /v1/kyc/sessions - Create a new KYC session
export async function POST(request: NextRequest) {
  try {
    // Extract and validate API key
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const clientInfo = await validateApiKeyAndGetClient(apiKey);
    if (!clientInfo) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Invalid API key" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      document_name,
      document_number,
      document_type = "1",
      success_url,
      fail_url,
      metadata = {},
    } = body;

    // Validate required fields
    if (!document_name || !document_number) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: "document_name and document_number are required" },
        { status: 400 }
      );
    }

    // Generate ref_id
    const refId = generateRefId(clientInfo.clientCode);

    // Create session record first (to get ID for credit reference)
    const session = await queryOne<{
      id: string;
      ref_id: string;
      created_at: string;
    }>(
      `INSERT INTO kyc_session 
        (client_id, ref_id, document_name, document_number, document_type, success_url, fail_url, metadata, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW() + INTERVAL '24 hours')
       RETURNING id, ref_id, created_at`,
      [
        clientInfo.clientId,
        refId,
        document_name,
        document_number,
        document_type,
        success_url || clientInfo.config.success_url,
        fail_url || clientInfo.config.fail_url,
        JSON.stringify(metadata),
      ]
    );

    if (!session) {
      return NextResponse.json(
        { error: "SERVER_ERROR", message: "Failed to create session" },
        { status: 500 }
      );
    }

    // Check credits (no deduction yet - billing happens on completion via webhook)
    const creditResult = await checkCredits(
      clientInfo.clientId,
      clientInfo.productId,
      clientInfo.config.allow_overdraft
    );

    if (!creditResult.success) {
      // Delete the session we just created
      await query("DELETE FROM kyc_session WHERE id = $1", [session.id]);
      
      return NextResponse.json(
        {
          error: "INSUFFICIENT_CREDITS",
          message: "Client credit balance exhausted",
          balance: creditResult.balance,
        },
        { status: 402 }
      );
    }

    // Get backend URL for callbacks and core URL for user-facing redirects
    const backendUrl = process.env.BETTER_AUTH_URL || "http://localhost:3001";
    const coreUrl = process.env.CORE_APP_URL || "http://localhost:3000";

    // Call Innovatif to create transaction
    try {
      const innovatifResult = await createInnovatifTransaction(
        {
          refId,
          documentName: document_name,
          documentNumber: document_number,
          documentType: document_type,
          sessionId: session.id,
        },
        backendUrl,
        coreUrl
      );

      // Update session with Innovatif response
      await query(
        `UPDATE kyc_session 
         SET innovatif_onboarding_id = $1, status = 'pending'
         WHERE id = $2`,
        [innovatifResult.onboardingId, session.id]
      );

      return NextResponse.json(
        {
          id: session.id,
          onboarding_url: innovatifResult.onboardingUrl,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          status: "pending",
        },
        { status: 201 }
      );
    } catch (innovatifError) {
      console.error("Innovatif API error:", innovatifError);
      
      // Update session to failed status - no billing since session never started
      // (billing only happens on completed sessions via webhook)
      await query(
        `UPDATE kyc_session SET status = 'expired', result = 'rejected', reject_message = $1 WHERE id = $2`,
        [innovatifError instanceof Error ? innovatifError.message : "Innovatif API error", session.id]
      );

      return NextResponse.json(
        { error: "GATEWAY_ERROR", message: "Failed to initiate KYC session" },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Error creating KYC session:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}
