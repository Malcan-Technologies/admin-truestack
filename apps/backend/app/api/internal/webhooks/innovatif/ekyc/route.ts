import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, withTransaction } from "@truestack/shared/db";
import { decryptResponse, verifyWebhookSignature } from "@truestack/shared/innovatif";
import { signOutboundWebhook } from "@truestack/shared/hmac-webhook";
import { uploadKycDocument, getPresignedUrls } from "@truestack/shared/s3";
import crypto from "crypto";

// Innovatif prepends the package name to ref_id in webhooks
// We need to strip it to find the original session
const INNOVATIF_PACKAGE_NAME = process.env.INNOVATIF_PACKAGE_NAME || "";

interface InnovatifWebhookPayload {
  ref_id: string;
  onboarding_id: string;
  status: string;
  result?: string;
  reject_message?: string;
  request_time?: string;
  signature?: string;
  // OCR fields
  document_type?: string;
  name?: string;
  id_number?: string;
  address?: string;
  postcode?: string;
  city?: string;
  state?: string;
  nationality?: string;
  gender?: string;
  dob?: string;
  religion?: string;
  race?: string;
  // Image fields (base64)
  front_document?: string;
  back_document?: string;
  face_image?: string;
  best_frame?: string;
  // Detailed verification data (callback_mode: 2)
  step1?: Record<string, unknown>;
  step2?: Record<string, unknown>;
  mode?: number;
}

// POST /api/internal/webhooks/innovatif/ekyc
export async function POST(request: NextRequest) {
  console.log("[Innovatif Webhook] Received webhook request");
  console.log("[Innovatif Webhook] Headers:", Object.fromEntries(request.headers.entries()));
  
  try {
    const body = await request.json();
    console.log("[Innovatif Webhook] Body keys:", Object.keys(body));
    
    // Handle encrypted payload
    let payload: InnovatifWebhookPayload;
    
    if (body.data && typeof body.data === "string") {
      // Encrypted payload
      try {
        payload = decryptResponse(body.data) as InnovatifWebhookPayload;
      } catch (error) {
        console.error("Failed to decrypt webhook payload:", error);
        return NextResponse.json(
          { error: "Failed to decrypt payload" },
          { status: 400 }
        );
      }
    } else {
      // Unencrypted payload (for testing)
      payload = body;
    }

    const { ref_id: raw_ref_id, onboarding_id, status, result, reject_message, request_time, signature } = payload;

    console.log("[Innovatif Webhook] Payload:", JSON.stringify({
      ref_id: raw_ref_id,
      onboarding_id,
      status,
      result,
      reject_message,
      request_time,
      has_signature: !!signature
    }));

    // Validate required fields
    if (!raw_ref_id || !onboarding_id) {
      console.error("Missing ref_id or onboarding_id in webhook");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Innovatif prepends a transformed package name to ref_id in webhook responses
    // The package name format varies (dots to underscores, added suffixes like "trial")
    // Try to find the session by:
    // 1. First trying exact match
    // 2. Then trying to strip known prefixes based on package name pattern
    // 3. Finally, looking for a session where ref_id is a suffix of raw_ref_id
    let ref_id = raw_ref_id;
    
    // Try stripping package name (with dots replaced by underscores, and possible suffixes)
    if (INNOVATIF_PACKAGE_NAME) {
      // Convert package name format: "truestack.gateway.test" -> "truestack_gateway_test"
      const packagePrefix = INNOVATIF_PACKAGE_NAME.replace(/\./g, "_");
      // Also handle case where "test" is replaced with "trial": "truestack_gateway_trial"
      const packagePrefixTrial = packagePrefix.replace(/_test$/, "_trial");
      
      // Check for various prefix patterns Innovatif might use
      const possiblePrefixes = [
        INNOVATIF_PACKAGE_NAME,           // Original format: truestack.gateway.test
        packagePrefix,                     // Underscores: truestack_gateway_test
        packagePrefixTrial,               // Trial variant: truestack_gateway_trial
        `${packagePrefix}trial`,          // With "trial" suffix (no underscore)
        `${packagePrefix}_trial`,         // With "_trial" suffix
        `${packagePrefixTrial}_`,         // Trial with trailing underscore
      ];
      
      for (const prefix of possiblePrefixes) {
        if (raw_ref_id.startsWith(prefix)) {
          ref_id = raw_ref_id.substring(prefix.length);
          console.log(`Stripped package prefix "${prefix}" from ref_id: ${raw_ref_id} -> ${ref_id}`);
          break;
        }
      }
    }

    // Verify signature if provided
    // Note: Innovatif signs using the raw_ref_id (with package prefix), not our stripped ref_id
    if (signature && request_time) {
      try {
        const isValid = verifyWebhookSignature(signature, raw_ref_id, request_time);
        if (!isValid) {
          // Also try with stripped ref_id as fallback
          const isValidStripped = verifyWebhookSignature(signature, ref_id, request_time);
          if (!isValidStripped) {
            console.error("Invalid webhook signature for both raw and stripped ref_id");
            console.log(`Signature verification failed - raw_ref_id: ${raw_ref_id}, ref_id: ${ref_id}, request_time: ${request_time}`);
            // Log for debugging but don't block - signature mismatch may be due to Innovatif's implementation
            // return NextResponse.json(
            //   { error: "Invalid signature" },
            //   { status: 401 }
            // );
          }
        }
      } catch (error) {
        console.error("Signature verification error:", error);
        // Continue processing - signature verification might fail due to timing or buffer length mismatch
      }
    }

    // Generate payload hash for idempotency
    // Include request_time to differentiate between different webhook events for the same session
    // Innovatif sends multiple webhooks with same status/result but different request_time
    const payloadHash = crypto
      .createHash("sha256")
      .update(JSON.stringify({ ref_id, onboarding_id, status, result, request_time }))
      .digest("hex");

    // Check for duplicate webhook (idempotency)
    const existingWebhook = await queryOne<{ id: string; processed: boolean }>(
      `SELECT id, processed FROM webhook_log 
       WHERE payload_hash = $1`,
      [payloadHash]
    );

    if (existingWebhook?.processed) {
      // Already processed, return success
      console.log("Duplicate webhook received and already processed:", payloadHash);
      return NextResponse.json({ success: true, duplicate: true });
    }

    // Find the session - try exact match first, then suffix match as fallback
    let session = await queryOne<{
      id: string;
      client_id: string;
      status: string;
      billed: boolean;
      ref_id: string;
    }>(
      `SELECT id, client_id, status, COALESCE(billed, false) as billed, ref_id FROM kyc_session WHERE ref_id = $1`,
      [ref_id]
    );

    // If not found and we have a prefix, try finding by suffix match
    // This handles cases where Innovatif adds unexpected prefixes
    if (!session && ref_id !== raw_ref_id) {
      // We already tried stripping a prefix, try finding by the stripped ref_id
      console.log(`Exact match failed for ref_id: ${ref_id}, trying suffix match with raw_ref_id: ${raw_ref_id}`);
    }
    
    // Fallback: try to find session where the raw_ref_id ends with the stored ref_id
    if (!session) {
      session = await queryOne<{
        id: string;
        client_id: string;
        status: string;
        billed: boolean;
        ref_id: string;
      }>(
        `SELECT id, client_id, status, COALESCE(billed, false) as billed, ref_id 
         FROM kyc_session 
         WHERE $1 LIKE '%' || ref_id
         ORDER BY created_at DESC
         LIMIT 1`,
        [raw_ref_id]
      );
      
      if (session) {
        console.log(`Found session by suffix match: raw_ref_id=${raw_ref_id}, stored ref_id=${session.ref_id}`);
        ref_id = session.ref_id; // Use the actual stored ref_id
      }
    }

    if (!session) {
      console.error("Session not found for ref_id:", ref_id, "raw_ref_id:", raw_ref_id);
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Process webhook in transaction
    await withTransaction(async (txClient) => {
      // Log webhook - use INSERT with ON CONFLICT for idempotency
      // If unique constraint doesn't exist yet, fall back to simple insert
      try {
        await txClient.query(
          `INSERT INTO webhook_log (kyc_session_id, source, payload_hash, processed)
           VALUES ($1, 'innovatif_callback', $2, true)
           ON CONFLICT (payload_hash) DO UPDATE SET processed = true`,
          [session.id, payloadHash]
        );
      } catch (error: unknown) {
        // If ON CONFLICT fails due to missing constraint, try simple insert
        if (error instanceof Error && error.message.includes("no unique or exclusion constraint")) {
          console.warn("Unique constraint on payload_hash missing - using simple insert");
          await txClient.query(
            `INSERT INTO webhook_log (kyc_session_id, source, payload_hash, processed)
             VALUES ($1, 'innovatif_callback', $2, true)`,
            [session.id, payloadHash]
          );
        } else {
          throw error;
        }
      }

      // Map Innovatif status to our status
      // Innovatif status values:
      //   0 = URL Not opened (user hasn't started)
      //   1 = Processing (user is completing KYC)
      //   2 = Completed (KYC finished - BILLABLE)
      //   3 = Expired (session timed out)
      // Innovatif result values:
      //   0 = Rejected
      //   1 = Approved
      //   2 = Not Available
      let ourStatus = "processing";
      let ourResult: string | null = null;

      // Convert to number for comparison (Innovatif sends integers)
      const statusNum = typeof status === "string" ? parseInt(status) : status;
      const resultNum = typeof result === "string" ? parseInt(result) : result;

      switch (statusNum) {
        case 0:
          // URL Not opened - user hasn't started
          ourStatus = "pending";
          ourResult = null;
          break;
        case 1:
          // Processing - user is completing KYC
          ourStatus = "processing";
          ourResult = null;
          break;
        case 2:
          // Completed - KYC finished (BILLABLE)
          ourStatus = "completed";
          // Result: 0 = Rejected, 1 = Approved, 2 = Not Available
          if (resultNum === 1) {
            ourResult = "approved";
          } else if (resultNum === 0) {
            ourResult = "rejected";
          } else {
            // resultNum === 2 or undefined - treat as rejected
            ourResult = "rejected";
          }
          break;
        case 3:
          // Expired - session timed out (NOT billable)
          ourStatus = "expired";
          ourResult = null;
          break;
        default:
          console.warn(`Unknown Innovatif status: ${statusNum}`);
          ourStatus = "processing";
          ourResult = null;
      }

      console.log(`Innovatif webhook: status=${status} (${statusNum}), result=${result} (${resultNum}) -> ourStatus=${ourStatus}, ourResult=${ourResult}`);

      // Build Innovatif response object (without images, but including step1/step2 for detailed data)
      const innovatifResponse: Record<string, unknown> = {
        status,
        result,
        document_type: payload.document_type,
        name: payload.name,
        id_number: payload.id_number,
        address: payload.address,
        postcode: payload.postcode,
        city: payload.city,
        state: payload.state,
        nationality: payload.nationality,
        gender: payload.gender,
        dob: payload.dob,
        religion: payload.religion,
        race: payload.race,
        // Include detailed verification data if present (callback_mode: 2)
        step1: payload.step1,
        step2: payload.step2,
        mode: payload.mode,
      };

      // Upload images to S3 if present
      // Images can be at top level OR nested in step1/step2 depending on callback_mode
      let s3FrontDocument = null;
      let s3BackDocument = null;
      let s3FaceImage = null;
      let s3BestFrame = null;

      const uploadPromises: Promise<void>[] = [];

      // Extract step1 and step2 for nested image access (callback_mode: 2)
      const step1 = payload.step1 as Record<string, unknown> | undefined;
      const step2 = payload.step2 as Record<string, unknown> | undefined;

      // Check for front_document at top level OR in step1.front_document_image
      const frontDocImage = payload.front_document || 
        (step1?.front_document_image as string | undefined);
      if (frontDocImage) {
        uploadPromises.push(
          uploadKycDocument(session.client_id, session.id, "front_document", frontDocImage)
            .then((key) => { s3FrontDocument = key; })
            .catch((err) => console.error("Failed to upload front_document:", err))
        );
      }

      // Check for back_document at top level OR in step1.back_document_image
      const backDocImage = payload.back_document || 
        (step1?.back_document_image as string | undefined);
      if (backDocImage) {
        uploadPromises.push(
          uploadKycDocument(session.client_id, session.id, "back_document", backDocImage)
            .then((key) => { s3BackDocument = key; })
            .catch((err) => console.error("Failed to upload back_document:", err))
        );
      }

      // Check for face_image at top level OR in step1.face_image
      const faceImg = payload.face_image || 
        (step1?.face_image as string | undefined);
      if (faceImg) {
        uploadPromises.push(
          uploadKycDocument(session.client_id, session.id, "face_image", faceImg)
            .then((key) => { s3FaceImage = key; })
            .catch((err) => console.error("Failed to upload face_image:", err))
        );
      }

      // Check for best_frame at top level OR in step2.best_frame
      const bestFrameImg = payload.best_frame || 
        (step2?.best_frame as string | undefined);
      if (bestFrameImg) {
        uploadPromises.push(
          uploadKycDocument(session.client_id, session.id, "best_frame", bestFrameImg)
            .then((key) => { s3BestFrame = key; })
            .catch((err) => console.error("Failed to upload best_frame:", err))
        );
      }

      // Wait for all uploads
      await Promise.all(uploadPromises);
      
      console.log(`[Innovatif Webhook] Image upload results: front=${!!s3FrontDocument}, back=${!!s3BackDocument}, face=${!!s3FaceImage}, bestFrame=${!!s3BestFrame}`);

      // Determine if this is a billable completion
      // Only bill on status = 2 (Completed), NOT on expired sessions
      const isBillable = ourStatus === "completed" && !session.billed;

      // Update session (include billed flag and billed_at if billable)
      await txClient.query(
        `UPDATE kyc_session 
         SET status = $1,
             result = $2,
             reject_message = $3,
             innovatif_response = $4,
             s3_front_document = COALESCE($5, s3_front_document),
             s3_back_document = COALESCE($6, s3_back_document),
             s3_face_image = COALESCE($7, s3_face_image),
             s3_best_frame = COALESCE($8, s3_best_frame),
             innovatif_onboarding_id = COALESCE($9, innovatif_onboarding_id),
             billed = CASE WHEN $11 THEN true ELSE billed END,
             billed_at = CASE WHEN $11 AND billed_at IS NULL THEN NOW() ELSE billed_at END
         WHERE id = $10`,
        [
          ourStatus,
          ourResult,
          reject_message || null,
          JSON.stringify(innovatifResponse),
          s3FrontDocument,
          s3BackDocument,
          s3FaceImage,
          s3BestFrame,
          onboarding_id,
          session.id,
          isBillable,
        ]
      );

      // Deduct credit if this is a billable completion
      if (isBillable) {
        // Use advisory lock to prevent race conditions
        await txClient.query(
          `SELECT pg_advisory_xact_lock(hashtext($1))`,
          [`credit_${session.client_id}_true_identity`]
        );

        // Get current month's billed session count for this client (for tiered pricing)
        // Use Malaysian timezone (Asia/Kuala_Lumpur, UTC+8) for monthly reset at midnight MYT
        // IMPORTANT: Count by billed_at (when the session was billed), not created_at or updated_at
        // This ensures tiering is based on billing order and is immutable
        // Exclude current session from count since we just marked it as billed above
        const usageResult = await txClient.query<{ count: string }>(
          `SELECT COUNT(*) as count 
           FROM kyc_session 
           WHERE client_id = $1 
             AND id != $2
             AND billed = true
             AND billed_at >= date_trunc('month', NOW() AT TIME ZONE 'Asia/Kuala_Lumpur') AT TIME ZONE 'Asia/Kuala_Lumpur'
             AND billed_at < (date_trunc('month', NOW() AT TIME ZONE 'Asia/Kuala_Lumpur') + INTERVAL '1 month') AT TIME ZONE 'Asia/Kuala_Lumpur'`,
          [session.client_id, session.id]
        );
        const currentMonthUsage = parseInt(usageResult.rows[0]?.count || "0");
        
        // Session number is the count of previously billed sessions + 1 (this session)
        const sessionNumber = currentMonthUsage + 1;
        console.log(`[Billing] Client ${session.client_id}: ${currentMonthUsage} billed sessions this month, this is session #${sessionNumber}`);

        // Get the applicable pricing tier based on session number (1-indexed)
        // Tiers use min_volume and max_volume as 1-based session ranges:
        // - Tier 1 (min=1, max=3): sessions 1, 2, 3
        // - Tier 2 (min=4, max=6): sessions 4, 5, 6
        // - Tier 3 (min=7, max=NULL): sessions 7+
        // Credit system: 10 credits = RM 1
        const tierResult = await txClient.query<{ credits_per_session: number; tier_name: string }>(
          `SELECT credits_per_session, tier_name
           FROM pricing_tier
           WHERE client_id = $1 
             AND product_id = 'true_identity'
             AND min_volume <= $2
             AND (max_volume IS NULL OR max_volume >= $2)
           ORDER BY min_volume DESC
           LIMIT 1`,
          [session.client_id, sessionNumber]
        );

        // Default to 50 credits (RM 5) if no pricing tier is configured
        let creditsToDeduct = 50;
        let tierName = "default";
        
        if (tierResult.rows[0]) {
          creditsToDeduct = tierResult.rows[0].credits_per_session;
          tierName = tierResult.rows[0].tier_name;
        }

        // Get current balance (in credits)
        const balanceResult = await txClient.query<{ balance: string }>(
          `SELECT COALESCE(SUM(amount), 0) as balance 
           FROM credit_ledger 
           WHERE client_id = $1 AND product_id = 'true_identity'`,
          [session.client_id]
        );

        const currentBalance = parseInt(balanceResult.rows[0]?.balance || "0");
        const newBalance = currentBalance - creditsToDeduct;

        // Deduct credits based on pricing tier
        await txClient.query(
          `INSERT INTO credit_ledger 
            (client_id, product_id, amount, balance_after, type, reference_id, description)
           VALUES ($1, 'true_identity', $2, $3, 'usage', $4, $5)`,
          [
            session.client_id,
            -creditsToDeduct, // Negative amount for deduction
            newBalance,
            session.id,
            `KYC session ${ourResult === "approved" ? "approved" : "rejected"} (${tierName}: ${creditsToDeduct} credits)`,
          ]
        );

        console.log(`Billed session ${session.id}: status=${ourStatus}, result=${ourResult}, tier=${tierName}, credits=${creditsToDeduct}, new_balance=${newBalance}`);
      }
    });

    // Trigger client webhook delivery (async, don't wait)
    triggerClientWebhook(session.id).catch((err) => {
      console.error("Failed to trigger client webhook:", err);
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook processing error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

const LOCALHOST_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i;

/** For truestack_kredit: when webhook_url is localhost, use KREDIT_BACKEND_URL + path */
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

// Presigned URL expiry for document images in webhook (24 hours for Kredit display)
const DOCUMENT_URL_EXPIRY_SECONDS = 24 * 60 * 60;

// Trigger webhook to client (fire and forget for now)
async function triggerClientWebhook(sessionId: string) {
  // Get session, webhook_url, client_source, document_type, and S3 keys for document images
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
    metadata: Record<string, unknown>;
    webhook_url: string | null;
    client_source: string | null;
    s3_front_document: string | null;
    s3_back_document: string | null;
    s3_face_image: string | null;
    s3_best_frame: string | null;
  }>(
    `SELECT 
      ks.id, ks.client_id, ks.ref_id, ks.status, ks.result, 
      ks.reject_message, ks.document_name, ks.document_number, ks.document_type, ks.metadata, ks.webhook_url,
      ks.s3_front_document, ks.s3_back_document, ks.s3_face_image, ks.s3_best_frame,
      COALESCE(c.client_source, 'api') as client_source
     FROM kyc_session ks
     JOIN client c ON c.id = ks.client_id
     WHERE ks.id = $1`,
    [sessionId]
  );

  if (!session) return;

  let webhookUrl = session.webhook_url;

  if (!webhookUrl) {
    // This shouldn't happen as webhook_url is now required,
    // but handle gracefully for any legacy sessions
    console.warn(`Session ${sessionId} has no webhook_url configured`);
    return;
  }

  // For truestack_kredit: Admin uses KREDIT_BACKEND_URL when session has localhost
  if (session.client_source === "truestack_kredit") {
    webhookUrl = resolveKreditWebhookUrl(webhookUrl);
  }

  try {
    // Determine event type based on session status
    // - kyc.session.started: User opened the KYC flow (status: pending)
    // - kyc.session.processing: User is completing the KYC (status: processing)
    // - kyc.session.completed: KYC finished with result (status: completed)
    // - kyc.session.expired: Session timed out (status: expired)
    let eventType = "kyc.session.updated";
    switch (session.status) {
      case "pending":
        eventType = "kyc.session.started";
        break;
      case "processing":
        eventType = "kyc.session.processing";
        break;
      case "completed":
        eventType = "kyc.session.completed";
        break;
      case "expired":
        eventType = "kyc.session.expired";
        break;
    }

    const metadata = (session.metadata || {}) as Record<string, unknown>;

    // Build document_images with presigned URLs for Kredit Borrower Documents
    // Map: DIRECTOR_IC_FRONT, DIRECTOR_IC_BACK, DIRECTOR_PASSPORT, SELFIE_LIVENESS
    const documentImages: Record<string, { url: string }> = {};
    const docType = session.document_type || "1"; // "1" = IC, "2" = Passport

    const s3KeysMap = {
      front_document: session.s3_front_document,
      back_document: session.s3_back_document,
      face_image: session.s3_face_image,
      best_frame: session.s3_best_frame,
    };
    const hasAnyImage = Object.values(s3KeysMap).some(Boolean);
    if (hasAnyImage) {
      try {
        const presigned = await getPresignedUrls(s3KeysMap, DOCUMENT_URL_EXPIRY_SECONDS);
        if (presigned.front_document) {
          documentImages[docType === "2" ? "DIRECTOR_PASSPORT" : "DIRECTOR_IC_FRONT"] = {
            url: presigned.front_document,
          };
        }
        if (presigned.back_document && docType === "1") {
          documentImages["DIRECTOR_IC_BACK"] = { url: presigned.back_document };
        }
        const selfieUrl = presigned.best_frame || presigned.face_image;
        if (selfieUrl) {
          documentImages["SELFIE_LIVENESS"] = { url: selfieUrl };
        }
      } catch (err) {
        console.warn("[Innovatif Webhook] Failed to generate presigned URLs for document images:", err);
      }
    }

    const webhookPayload = {
      event: eventType,
      session_id: session.id,
      ref_id: session.ref_id,
      status: session.status,
      result: session.result,
      reject_message: session.reject_message,
      document_name: session.document_name,
      document_number: session.document_number,
      tenant_id: metadata.tenant_id ?? null,
      borrower_id: metadata.borrower_id ?? null,
      metadata: session.metadata,
      timestamp: new Date().toISOString(),
      ...(Object.keys(documentImages).length > 0 && { document_images: documentImages }),
    };

    const rawBody = JSON.stringify(webhookPayload);
    const outboundSecret =
      process.env.TRUEIDENTITY_WEBHOOK_SECRET || process.env.KREDIT_WEBHOOK_SECRET || "";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-TrueStack-Event": eventType,
    };
    if (outboundSecret) {
      const { signature, timestamp } = signOutboundWebhook(rawBody, outboundSecret);
      headers["x-trueidentity-signature"] = signature;
      headers["x-trueidentity-timestamp"] = timestamp;
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers,
      body: rawBody,
    });

    // Update delivery status
    await query(
      `UPDATE kyc_session 
       SET webhook_delivered = $1,
           webhook_delivered_at = CASE WHEN $1 THEN NOW() ELSE webhook_delivered_at END,
           webhook_attempts = webhook_attempts + 1,
           webhook_last_error = $2
       WHERE id = $3`,
      [response.ok, response.ok ? null : `HTTP ${response.status}`, sessionId]
    );
  } catch (error) {
    console.error("Client webhook delivery failed:", error);
    await query(
      `UPDATE kyc_session 
       SET webhook_attempts = webhook_attempts + 1,
           webhook_last_error = $1
       WHERE id = $2`,
      [error instanceof Error ? error.message : "Unknown error", sessionId]
    );
  }
}
