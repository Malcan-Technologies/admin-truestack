import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@truestack/shared/db";
import { hashApiKey } from "@truestack/shared/api-keys";
import { getInnovatifTransactionStatus } from "@truestack/shared/innovatif";
import { uploadKycDocument, DocumentType, getPresignedUrls } from "@truestack/shared/s3";

// Helper to extract API key from Authorization header
function extractApiKey(request: NextRequest): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.substring(7);
}

// Helper to get client ID from API key
async function getClientIdFromApiKey(apiKey: string): Promise<string | null> {
  const hash = hashApiKey(apiKey);
  
  const keyData = await queryOne<{
    client_id: string;
  }>(
    `SELECT client_id FROM client_api_key 
     WHERE api_key_hash = $1 AND status = 'active'`,
    [hash]
  );

  return keyData?.client_id || null;
}

// GET /v1/kyc/sessions/:id - Get session details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Extract and validate API key
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const clientId = await getClientIdFromApiKey(apiKey);
    if (!clientId) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Invalid API key" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get session (only if it belongs to this client)
    const session = await queryOne<{
      id: string;
      client_id: string;
      ref_id: string;
      status: string;
      result: string | null;
      reject_message: string | null;
      document_name: string;
      document_number: string;
      document_type: string;
      innovatif_response: Record<string, unknown> | null;
      metadata: Record<string, unknown>;
      created_at: string;
      updated_at: string;
      expires_at: string | null;
    }>(
      `SELECT 
        id,
        client_id,
        ref_id,
        status,
        result,
        reject_message,
        document_name,
        document_number,
        document_type,
        innovatif_response,
        metadata,
        created_at,
        updated_at,
        expires_at
       FROM kyc_session 
       WHERE id = $1`,
      [id]
    );

    if (!session) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Session not found" },
        { status: 404 }
      );
    }

    // Verify session belongs to this client
    if (session.client_id !== clientId) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Session does not belong to this client" },
        { status: 403 }
      );
    }

    // Build response based on status
    const response: Record<string, unknown> = {
      id: session.id,
      status: session.status,
      result: session.result,
      document_name: session.document_name,
      document_number: session.document_number,
      document_type: session.document_type,
      metadata: session.metadata,
      created_at: session.created_at,
      updated_at: session.updated_at,
    };

    // Include rejection message if rejected
    if (session.result === "rejected" && session.reject_message) {
      response.reject_message = session.reject_message;
    }

    // Include OCR result if completed and available
    if (session.status === "completed" && session.innovatif_response) {
      // Extract OCR data from Innovatif response (exclude images)
      const ocrFields = [
        "document_type",
        "name",
        "id_number",
        "address",
        "postcode",
        "city",
        "state",
        "nationality",
        "gender",
        "dob",
        "religion",
        "race",
      ];
      
      const ocrResult: Record<string, unknown> = {};
      for (const field of ocrFields) {
        if (session.innovatif_response[field] !== undefined) {
          ocrResult[field] = session.innovatif_response[field];
        }
      }
      
      if (Object.keys(ocrResult).length > 0) {
        response.ocr_result = ocrResult;
      }
    }

    // Include document URLs if completed (references to our proxy endpoint)
    if (session.status === "completed") {
      const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3001";
      response.documents = {
        front_document: `${baseUrl}/api/v1/kyc/sessions/${id}/documents/front_document`,
        back_document: `${baseUrl}/api/v1/kyc/sessions/${id}/documents/back_document`,
        face_image: `${baseUrl}/api/v1/kyc/sessions/${id}/documents/face_image`,
        best_frame: `${baseUrl}/api/v1/kyc/sessions/${id}/documents/best_frame`,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching session:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /v1/kyc/sessions/:id/refresh - Refresh session status from Innovatif
// Note: This is handled by a separate route file, but we add POST here for
// clients who want to trigger a status refresh from Innovatif directly.
// This is useful when webhooks are delayed or missed.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Extract and validate API key
    const apiKey = extractApiKey(request);
    if (!apiKey) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Missing or invalid Authorization header" },
        { status: 401 }
      );
    }

    const clientId = await getClientIdFromApiKey(apiKey);
    if (!clientId) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Invalid API key" },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Get session (only if it belongs to this client)
    const session = await queryOne<{
      id: string;
      client_id: string;
      ref_id: string;
      innovatif_ref_id: string | null;
      status: string;
      result: string | null;
      innovatif_onboarding_id: string | null;
      platform: string;
      billed: boolean;
    }>(
      `SELECT id, client_id, ref_id, innovatif_ref_id, status, result, innovatif_onboarding_id, platform, COALESCE(billed, false) as billed
       FROM kyc_session 
       WHERE id = $1`,
      [id]
    );

    if (!session) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Session not found" },
        { status: 404 }
      );
    }

    // Verify session belongs to this client
    if (session.client_id !== clientId) {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Session does not belong to this client" },
        { status: 403 }
      );
    }

    // If session is already completed, return current status without calling Innovatif
    if (session.status === "completed" || session.status === "expired") {
      return NextResponse.json({
        id: session.id,
        status: session.status,
        result: session.result,
        message: "Session already finalized",
        refreshed: false,
      });
    }

    // Check if we have the onboarding_id required for Innovatif API
    if (!session.innovatif_onboarding_id) {
      return NextResponse.json({
        id: session.id,
        status: session.status,
        result: session.result,
        refreshed: false,
        error: "Session missing Innovatif onboarding ID - cannot refresh from provider",
      });
    }

    // Call Innovatif to get current status with mode 2 (detail with images)
    try {
      const platform = (session.platform || "Web") as "Web" | "iOS" | "Android";
      // Use the prefixed ref_id from Innovatif if available, otherwise fall back to our ref_id
      // Per Innovatif API docs, the ref_id returned from create-transaction (with prefix) should be used for get-status
      const refIdForInnovatif = session.innovatif_ref_id || session.ref_id;
      const innovatifStatus = await getInnovatifTransactionStatus(
        refIdForInnovatif,
        session.innovatif_onboarding_id,
        platform,
        2 // Detail mode - includes images
      );
      
      console.log(`Innovatif status for session ${id}:`, {
        status: innovatifStatus.status,
        result: innovatifStatus.result,
        hasStep1: !!innovatifStatus.data?.step1,
        hasStep2: !!innovatifStatus.data?.step2,
      });

      // Map Innovatif status to our status
      let ourStatus = session.status;
      let ourResult = session.result;
      let rejectMessage: string | null = null;

      // Innovatif status codes: 1=pending, 2=completed, 3=expired
      // Innovatif result: 1=approved/PASS, 0=rejected/FAIL
      if (innovatifStatus.status === "2" || innovatifStatus.status === "completed") {
        ourStatus = "completed";
        const resultValue = innovatifStatus.result || innovatifStatus.data?.result;
        ourResult = resultValue === "1" || resultValue === "PASS" || resultValue === "approved" 
          ? "approved" 
          : "rejected";
        
        if (ourResult === "rejected" && innovatifStatus.data?.reject_message) {
          rejectMessage = String(innovatifStatus.data.reject_message);
        }
      } else if (innovatifStatus.status === "3" || innovatifStatus.status === "expired") {
        ourStatus = "expired";
        ourResult = "rejected";
      } else if (innovatifStatus.status === "1" || innovatifStatus.status === "pending") {
        ourStatus = "pending";
      }

      // S3 paths for images
      let s3FrontDocument: string | null = null;
      let s3BackDocument: string | null = null;
      let s3FaceImage: string | null = null;
      let s3BestFrame: string | null = null;

      // Upload images to S3 if present in response (idempotent - skips if exists)
      const step1 = innovatifStatus.data?.step1 as Record<string, unknown> | undefined;
      const step2 = innovatifStatus.data?.step2 as Record<string, unknown> | undefined;

      if (step1) {
        if (step1.front_document_image && typeof step1.front_document_image === "string") {
          try {
            s3FrontDocument = await uploadKycDocument(
              session.client_id,
              session.id,
              "front_document",
              step1.front_document_image
            );
          } catch (e) {
            console.error("Failed to upload front document:", e);
          }
        }
        if (step1.back_document_image && typeof step1.back_document_image === "string") {
          try {
            s3BackDocument = await uploadKycDocument(
              session.client_id,
              session.id,
              "back_document",
              step1.back_document_image
            );
          } catch (e) {
            console.error("Failed to upload back document:", e);
          }
        }
        if (step1.face_image && typeof step1.face_image === "string") {
          try {
            s3FaceImage = await uploadKycDocument(
              session.client_id,
              session.id,
              "face_image",
              step1.face_image
            );
          } catch (e) {
            console.error("Failed to upload face image:", e);
          }
        }
      }

      if (step2) {
        if (step2.best_frame && typeof step2.best_frame === "string") {
          try {
            s3BestFrame = await uploadKycDocument(
              session.client_id,
              session.id,
              "best_frame",
              step2.best_frame
            );
          } catch (e) {
            console.error("Failed to upload best frame:", e);
          }
        }
      }

      // Strip base64 images from the response before storing in DB (too large)
      const innovatifResponseForDb = innovatifStatus.data ? {
        ...innovatifStatus.data,
        step1: step1 ? {
          ...step1,
          front_document_image: undefined,
          back_document_image: undefined,
          face_image: undefined,
        } : undefined,
        step2: step2 ? {
          ...step2,
          best_frame: undefined,
        } : undefined,
      } : null;

      // Determine if this is a billable completion (completed or expired, not already billed)
      const isBillable = (ourStatus === "completed" || ourStatus === "expired") && !session.billed;

      // Update session with status, S3 paths, and billing flag
      await query(
        `UPDATE kyc_session 
         SET status = $1, 
             result = $2, 
             reject_message = COALESCE($3, reject_message),
             innovatif_response = COALESCE($4::jsonb, innovatif_response),
             s3_front_document = COALESCE($5, s3_front_document),
             s3_back_document = COALESCE($6, s3_back_document),
             s3_face_image = COALESCE($7, s3_face_image),
             s3_best_frame = COALESCE($8, s3_best_frame),
             billed = CASE WHEN $10 THEN true ELSE billed END,
             updated_at = NOW()
         WHERE id = $9`,
        [
          ourStatus,
          ourResult,
          rejectMessage,
          innovatifResponseForDb ? JSON.stringify(innovatifResponseForDb) : null,
          s3FrontDocument,
          s3BackDocument,
          s3FaceImage,
          s3BestFrame,
          id,
          isBillable, // $10 - mark as billed if this is a billable completion
        ]
      );

      // Deduct credit if this is a billable completion (webhook was missed)
      if (isBillable) {
        console.log(`Billing session ${id} via get-status (webhook likely missed)`);
        
        try {
          // Use advisory lock to prevent race conditions with concurrent requests
          await query(
            `SELECT pg_advisory_xact_lock(hashtext($1))`,
            [`credit_${session.client_id}_true_identity`]
          );

          // Get current month's completed session count for this client (for tiered pricing)
          const usageResult = await queryOne<{ count: string }>(
            `SELECT COUNT(*) as count 
             FROM kyc_session 
             WHERE client_id = $1 
               AND billed = true
               AND created_at >= date_trunc('month', CURRENT_DATE)
               AND created_at < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month'`,
            [session.client_id]
          );
          const currentMonthUsage = parseInt(usageResult?.count || "0");

          // Get the applicable pricing tier based on current usage
          // Credit system: 10 credits = RM 1
          const tierResult = await queryOne<{ credits_per_session: number; tier_name: string }>(
            `SELECT credits_per_session, tier_name
             FROM pricing_tier 
             WHERE client_id = $1 
               AND product_id = 'true_identity'
               AND min_volume <= $2
               AND (max_volume IS NULL OR max_volume >= $2)
             ORDER BY min_volume DESC
             LIMIT 1`,
            [session.client_id, currentMonthUsage + 1] // +1 because this session counts
          );

          // Default to 50 credits (RM 5) if no pricing tier is configured
          let creditsToDeduct = 50;
          let tierName = "default";
          
          if (tierResult) {
            creditsToDeduct = tierResult.credits_per_session;
            tierName = tierResult.tier_name;
          }

          // Get current balance (in credits)
          const balanceResult = await queryOne<{ balance: string }>(
            `SELECT COALESCE(SUM(amount), 0) as balance 
             FROM credit_ledger 
             WHERE client_id = $1 AND product_id = 'true_identity'`,
            [session.client_id]
          );

          const currentBalance = parseInt(balanceResult?.balance || "0");
          const newBalance = currentBalance - creditsToDeduct;

          // Deduct credits based on pricing tier
          await query(
            `INSERT INTO credit_ledger 
              (client_id, product_id, amount, balance_after, type, reference_id, description)
             VALUES ($1, 'true_identity', $2, $3, 'usage', $4, $5)`,
            [
              session.client_id,
              -creditsToDeduct, // Negative amount for deduction
              newBalance,
              session.id,
              `KYC session ${ourResult === "approved" ? "approved" : "rejected"} via get-status (${tierName}: ${creditsToDeduct} credits)`,
            ]
          );

          console.log(`Billed session ${session.id} via get-status: status=${ourStatus}, result=${ourResult}, tier=${tierName}, credits=${creditsToDeduct}, new_balance=${newBalance}`);
        } catch (billingError) {
          console.error(`Failed to bill session ${session.id}:`, billingError);
          // Don't fail the request if billing fails - the session is already marked as billed
          // so this won't result in duplicate charges
        }
      }

      // Build response for client - generate pre-signed URLs for secure, time-limited access
      // URLs expire after 1 hour (3600 seconds) by default
      const presignedImages = await getPresignedUrls({
        front_document: s3FrontDocument,
        back_document: s3BackDocument,
        face_image: s3FaceImage,
        best_frame: s3BestFrame,
      });

      // Build a clean, client-friendly response
      const ocrResult = step1?.ocr_result as Record<string, unknown> | undefined;
      const textSimilarity = step1?.text_similarity_result as Record<string, unknown> | undefined;
      const landmarkStatus = step1?.landmark_status as Record<string, unknown> | undefined;

      return NextResponse.json({
        // Session identification
        id: session.id,
        ref_id: session.ref_id,
        
        // Status
        status: ourStatus,
        result: ourResult,
        reject_message: rejectMessage,
        refreshed: true,
        
        // Document data extracted from OCR
        document: ocrResult ? {
          full_name: ocrResult.full_name,
          id_number: ocrResult.front_document_number,
          id_number_back: ocrResult.back_document_number,
          address: ocrResult.front_document_address,
          gender: ocrResult.front_document_gender,
        } : null,
        
        // Verification results
        verification: {
          // Document verification (Step 1)
          document_valid: step1?.status ?? false,
          name_match: textSimilarity?.name_similarity_status ? true : false,
          id_match: textSimilarity?.document_number_similarity_status ? true : false,
          front_back_match: textSimilarity?.front_back_number_similarity_status ? true : false,
          landmark_valid: landmarkStatus?.landmark_is_valid ?? false,
          
          // Facial verification (Step 2)
          face_match: step2?.is_identical ?? false,
          face_match_score: step2?.percentage ?? null,
          liveness_passed: step2?.status ?? false,
        },
        
        // Document images (pre-signed S3 URLs, valid for 1 hour)
        images: presignedImages,
        
        // Raw provider data (for debugging/advanced use)
        _raw: {
          innovatif_status: innovatifStatus.status,
          step1: step1 ? {
            status: step1.status,
            ocr_result: step1.ocr_result,
            text_similarity_result: step1.text_similarity_result,
            landmark: step1.landmark,
            landmark_status: step1.landmark_status,
            attempt: step1.attempt,
          } : null,
          step2: step2 ? {
            status: step2.status,
            is_identical: step2.is_identical,
            percentage: step2.percentage,
            attempt: step2.attempt,
          } : null,
        },
      });
    } catch (innovatifError) {
      console.error("Error fetching status from Innovatif:", innovatifError);
      
      // Return current status with error indication
      return NextResponse.json({
        id: session.id,
        status: session.status,
        result: session.result,
        refreshed: false,
        error: "Failed to fetch status from provider",
      });
    }
  } catch (error) {
    console.error("Error refreshing session:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}
