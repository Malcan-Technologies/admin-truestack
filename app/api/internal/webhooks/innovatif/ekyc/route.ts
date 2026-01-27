import { NextRequest, NextResponse } from "next/server";
import { query, queryOne, withTransaction } from "@/lib/db";
import { decryptResponse, verifyWebhookSignature } from "@/lib/innovatif";
import { uploadKycDocument } from "@/lib/s3";
import crypto from "crypto";

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
}

// POST /api/internal/webhooks/innovatif/ekyc
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
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

    const { ref_id, onboarding_id, status, result, reject_message, request_time, signature } = payload;

    // Validate required fields
    if (!ref_id || !onboarding_id) {
      console.error("Missing ref_id or onboarding_id in webhook");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Verify signature if provided
    if (signature && request_time) {
      try {
        const isValid = verifyWebhookSignature(signature, ref_id, request_time);
        if (!isValid) {
          console.error("Invalid webhook signature");
          return NextResponse.json(
            { error: "Invalid signature" },
            { status: 401 }
          );
        }
      } catch (error) {
        console.error("Signature verification error:", error);
        // Continue processing - signature verification might fail due to timing
      }
    }

    // Generate payload hash for idempotency
    const payloadHash = crypto
      .createHash("sha256")
      .update(JSON.stringify({ ref_id, onboarding_id, status, result }))
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

    // Find the session
    const session = await queryOne<{
      id: string;
      client_id: string;
      status: string;
    }>(
      `SELECT id, client_id, status FROM kyc_session WHERE ref_id = $1`,
      [ref_id]
    );

    if (!session) {
      console.error("Session not found for ref_id:", ref_id);
      return NextResponse.json(
        { error: "Session not found" },
        { status: 404 }
      );
    }

    // Process webhook in transaction
    await withTransaction(async (txClient) => {
      // Log webhook
      await txClient.query(
        `INSERT INTO webhook_log (kyc_session_id, source, payload_hash, processed)
         VALUES ($1, 'innovatif_callback', $2, true)
         ON CONFLICT (payload_hash) DO UPDATE SET processed = true`,
        [session.id, payloadHash]
      );

      // Map Innovatif status to our status
      let ourStatus = "processing";
      let ourResult = null;

      if (status === "completed" || status === "success") {
        ourStatus = "completed";
        ourResult = result === "PASS" || result === "approved" ? "approved" : "rejected";
      } else if (status === "expired" || status === "failed") {
        ourStatus = "expired";
        ourResult = "rejected";
      }

      // Build Innovatif response object (without images)
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
      };

      // Upload images to S3 if present
      let s3FrontDocument = null;
      let s3BackDocument = null;
      let s3FaceImage = null;
      let s3BestFrame = null;

      const uploadPromises: Promise<void>[] = [];

      if (payload.front_document) {
        uploadPromises.push(
          uploadKycDocument(session.client_id, session.id, "front_document", payload.front_document)
            .then((key) => { s3FrontDocument = key; })
            .catch((err) => console.error("Failed to upload front_document:", err))
        );
      }

      if (payload.back_document) {
        uploadPromises.push(
          uploadKycDocument(session.client_id, session.id, "back_document", payload.back_document)
            .then((key) => { s3BackDocument = key; })
            .catch((err) => console.error("Failed to upload back_document:", err))
        );
      }

      if (payload.face_image) {
        uploadPromises.push(
          uploadKycDocument(session.client_id, session.id, "face_image", payload.face_image)
            .then((key) => { s3FaceImage = key; })
            .catch((err) => console.error("Failed to upload face_image:", err))
        );
      }

      if (payload.best_frame) {
        uploadPromises.push(
          uploadKycDocument(session.client_id, session.id, "best_frame", payload.best_frame)
            .then((key) => { s3BestFrame = key; })
            .catch((err) => console.error("Failed to upload best_frame:", err))
        );
      }

      // Wait for all uploads
      await Promise.all(uploadPromises);

      // Update session
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
             innovatif_onboarding_id = COALESCE($9, innovatif_onboarding_id)
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
        ]
      );
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

// Trigger webhook to client (fire and forget for now)
async function triggerClientWebhook(sessionId: string) {
  // Get session and client config
  const session = await queryOne<{
    id: string;
    client_id: string;
    ref_id: string;
    status: string;
    result: string | null;
    reject_message: string | null;
    document_name: string;
    document_number: string;
    metadata: Record<string, unknown>;
  }>(
    `SELECT 
      ks.id, ks.client_id, ks.ref_id, ks.status, ks.result, 
      ks.reject_message, ks.document_name, ks.document_number, ks.metadata
     FROM kyc_session ks
     WHERE ks.id = $1`,
    [sessionId]
  );

  if (!session) return;

  const config = await queryOne<{ webhook_url: string | null }>(
    `SELECT webhook_url FROM client_product_config 
     WHERE client_id = $1 AND product_id = 'true_identity'`,
    [session.client_id]
  );

  if (!config?.webhook_url) {
    // No webhook configured
    return;
  }

  try {
    const webhookPayload = {
      event: "kyc.session.completed",
      session_id: session.id,
      ref_id: session.ref_id,
      status: session.status,
      result: session.result,
      reject_message: session.reject_message,
      document_name: session.document_name,
      document_number: session.document_number,
      metadata: session.metadata,
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(config.webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-TrueStack-Event": "kyc.session.completed",
      },
      body: JSON.stringify(webhookPayload),
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
