import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, withTransaction } from "@/lib/db";
import { hashApiKey } from "@/lib/api-keys";
import { createInnovatifTransaction } from "@/lib/innovatif";
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

// Helper to check and deduct credits
async function checkAndDeductCredit(
  clientId: string,
  productId: string,
  allowOverdraft: boolean,
  referenceId: string
): Promise<{ success: boolean; balance: number; error?: string }> {
  return withTransaction(async (txClient) => {
    // Get current balance with row lock
    const balanceResult = await txClient.query<{ balance: string }>(
      `SELECT COALESCE(SUM(amount), 0) as balance 
       FROM credit_ledger 
       WHERE client_id = $1 AND product_id = $2
       FOR UPDATE`,
      [clientId, productId]
    );

    const currentBalance = parseInt(balanceResult.rows[0]?.balance || "0");

    // Check if sufficient credits (unless overdraft allowed)
    if (currentBalance < 1 && !allowOverdraft) {
      return {
        success: false,
        balance: currentBalance,
        error: "Insufficient credits",
      };
    }

    const newBalance = currentBalance - 1;

    // Deduct credit
    await txClient.query(
      `INSERT INTO credit_ledger 
        (client_id, product_id, amount, balance_after, type, reference_id, description)
       VALUES ($1, $2, -1, $3, 'usage', $4, 'KYC session creation')`,
      [clientId, productId, newBalance, referenceId]
    );

    return { success: true, balance: newBalance };
  });
}

// Generate unique ref_id for Innovatif
function generateRefId(clientCode: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(6).toString("hex");
  return `${clientCode}_${timestamp}_${random}`;
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

    // Check and deduct credits
    const creditResult = await checkAndDeductCredit(
      clientInfo.clientId,
      clientInfo.productId,
      clientInfo.config.allow_overdraft,
      session.id
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

    // Call Innovatif to create transaction
    try {
      const innovatifResult = await createInnovatifTransaction({
        refId,
        documentName: document_name,
        documentNumber: document_number,
        documentType: document_type,
        sessionId: session.id,
      });

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
      
      // Update session to failed status but keep the credit deducted
      // (failures are billable per requirements)
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
