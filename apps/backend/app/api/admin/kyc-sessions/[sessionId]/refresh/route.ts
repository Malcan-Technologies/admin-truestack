import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@truestack/shared/db";
import { getInnovatifTransactionStatus } from "@truestack/shared/innovatif";
import { uploadKycDocument, getPresignedUrl } from "@truestack/shared/s3";

// Helper to get pre-signed URLs for images
async function getPresignedUrls(images: {
  front_document: string | null;
  back_document: string | null;
  face_image: string | null;
  best_frame: string | null;
}) {
  const urls: Record<string, string | undefined> = {};

  if (images.front_document) {
    try {
      urls.front_document = await getPresignedUrl(images.front_document);
    } catch (e) {
      console.error("Failed to get presigned URL for front_document:", e);
    }
  }
  if (images.back_document) {
    try {
      urls.back_document = await getPresignedUrl(images.back_document);
    } catch (e) {
      console.error("Failed to get presigned URL for back_document:", e);
    }
  }
  if (images.face_image) {
    try {
      urls.face_image = await getPresignedUrl(images.face_image);
    } catch (e) {
      console.error("Failed to get presigned URL for face_image:", e);
    }
  }
  if (images.best_frame) {
    try {
      urls.best_frame = await getPresignedUrl(images.best_frame);
    } catch (e) {
      console.error("Failed to get presigned URL for best_frame:", e);
    }
  }

  return urls;
}

// POST /api/admin/kyc-sessions/:sessionId/refresh
// Refreshes session status from Innovatif and uploads images to S3
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  // Check admin authentication
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;

  // Get session details
  const kycSession = await queryOne<{
    id: string;
    client_id: string;
    ref_id: string;
    innovatif_ref_id: string | null;
    status: string;
    result: string | null;
    innovatif_onboarding_id: string | null;
    platform: string;
    billed: boolean;
    s3_front_document: string | null;
    s3_back_document: string | null;
    s3_face_image: string | null;
    s3_best_frame: string | null;
  }>(
    `SELECT id, client_id, ref_id, innovatif_ref_id, status, result, 
            innovatif_onboarding_id, platform, COALESCE(billed, false) as billed,
            s3_front_document, s3_back_document, s3_face_image, s3_best_frame
     FROM kyc_session 
     WHERE id = $1`,
    [sessionId]
  );

  if (!kycSession) {
    return NextResponse.json(
      { error: "Session not found" },
      { status: 404 }
    );
  }

  // Check if we have the onboarding_id required for Innovatif API
  if (!kycSession.innovatif_onboarding_id) {
    return NextResponse.json({
      success: false,
      error: "Session missing Innovatif onboarding ID - cannot refresh from provider",
    }, { status: 400 });
  }

  // Call Innovatif to get current status with mode 2 (detail with images)
  try {
    const platform = (kycSession.platform || "Web") as "Web" | "iOS" | "Android";
    const refIdForInnovatif = kycSession.innovatif_ref_id || kycSession.ref_id;
    
    console.log(`[Admin Refresh] Fetching status from Innovatif for session ${sessionId}`);
    const innovatifStatus = await getInnovatifTransactionStatus(
      refIdForInnovatif,
      kycSession.innovatif_onboarding_id,
      platform,
      2 // Detail mode - includes images
    );

    console.log(`[Admin Refresh] Innovatif response:`, {
      status: innovatifStatus.status,
      result: innovatifStatus.result,
      hasStep1: !!innovatifStatus.data?.step1,
      hasStep2: !!innovatifStatus.data?.step2,
    });

    // Map Innovatif status to our status
    let ourStatus = kycSession.status;
    let ourResult: string | null = kycSession.result;
    let rejectMessage: string | null = null;

    const statusNum = typeof innovatifStatus.status === "string" 
      ? parseInt(innovatifStatus.status) 
      : innovatifStatus.status;
    const resultValue = innovatifStatus.result ?? innovatifStatus.data?.result;
    const resultNum = typeof resultValue === "string" 
      ? parseInt(resultValue) 
      : resultValue;

    switch (statusNum) {
      case 0:
        ourStatus = "pending";
        ourResult = null;
        break;
      case 1:
        ourStatus = "processing";
        ourResult = null;
        break;
      case 2:
        ourStatus = "completed";
        if (resultNum === 1) {
          ourResult = "approved";
        } else if (resultNum === 0) {
          ourResult = "rejected";
          if (innovatifStatus.data?.reject_message) {
            rejectMessage = String(innovatifStatus.data.reject_message);
          }
        } else {
          ourResult = "rejected";
        }
        break;
      case 3:
        ourStatus = "expired";
        ourResult = null;
        break;
    }

    // Upload images to S3 if present in response
    let s3FrontDocument: string | null = kycSession.s3_front_document;
    let s3BackDocument: string | null = kycSession.s3_back_document;
    let s3FaceImage: string | null = kycSession.s3_face_image;
    let s3BestFrame: string | null = kycSession.s3_best_frame;

    const step1 = innovatifStatus.data?.step1 as Record<string, unknown> | undefined;
    const step2 = innovatifStatus.data?.step2 as Record<string, unknown> | undefined;

    // Upload front document if not already stored
    if (!s3FrontDocument && step1?.front_document_image && typeof step1.front_document_image === "string") {
      try {
        s3FrontDocument = await uploadKycDocument(
          kycSession.client_id,
          kycSession.id,
          "front_document",
          step1.front_document_image
        );
        console.log(`[Admin Refresh] Uploaded front_document: ${s3FrontDocument}`);
      } catch (e) {
        console.error("Failed to upload front document:", e);
      }
    }

    // Upload back document if not already stored
    if (!s3BackDocument && step1?.back_document_image && typeof step1.back_document_image === "string") {
      try {
        s3BackDocument = await uploadKycDocument(
          kycSession.client_id,
          kycSession.id,
          "back_document",
          step1.back_document_image
        );
        console.log(`[Admin Refresh] Uploaded back_document: ${s3BackDocument}`);
      } catch (e) {
        console.error("Failed to upload back document:", e);
      }
    }

    // Upload face image if not already stored
    if (!s3FaceImage && step1?.face_image && typeof step1.face_image === "string") {
      try {
        s3FaceImage = await uploadKycDocument(
          kycSession.client_id,
          kycSession.id,
          "face_image",
          step1.face_image
        );
        console.log(`[Admin Refresh] Uploaded face_image: ${s3FaceImage}`);
      } catch (e) {
        console.error("Failed to upload face image:", e);
      }
    }

    // Upload best frame if not already stored
    if (!s3BestFrame && step2?.best_frame && typeof step2.best_frame === "string") {
      try {
        s3BestFrame = await uploadKycDocument(
          kycSession.client_id,
          kycSession.id,
          "best_frame",
          step2.best_frame
        );
        console.log(`[Admin Refresh] Uploaded best_frame: ${s3BestFrame}`);
      } catch (e) {
        console.error("Failed to upload best frame:", e);
      }
    }

    // Build innovatif_response object to store
    const innovatifResponse: Record<string, unknown> = {
      status: statusNum,
      result: resultNum,
      step1,
      step2,
      mode: innovatifStatus.data?.mode,
    };

    // Update session in database
    await query(
      `UPDATE kyc_session 
       SET status = $1,
           result = $2,
           reject_message = COALESCE($3, reject_message),
           innovatif_response = $4,
           s3_front_document = COALESCE($5, s3_front_document),
           s3_back_document = COALESCE($6, s3_back_document),
           s3_face_image = COALESCE($7, s3_face_image),
           s3_best_frame = COALESCE($8, s3_best_frame),
           updated_at = NOW()
       WHERE id = $9`,
      [
        ourStatus,
        ourResult,
        rejectMessage,
        JSON.stringify(innovatifResponse),
        s3FrontDocument,
        s3BackDocument,
        s3FaceImage,
        s3BestFrame,
        sessionId,
      ]
    );

    // Generate pre-signed URLs for images
    const presignedImages = await getPresignedUrls({
      front_document: s3FrontDocument,
      back_document: s3BackDocument,
      face_image: s3FaceImage,
      best_frame: s3BestFrame,
    });

    // Extract OCR and verification data
    const ocrResult = step1?.ocr_result as Record<string, unknown> | undefined;
    const textSimilarity = step1?.text_similarity_result as Record<string, unknown> | undefined;
    const landmarkStatus = step1?.landmark_status as Record<string, unknown> | undefined;

    return NextResponse.json({
      success: true,
      refreshed: true,
      session: {
        id: sessionId,
        status: ourStatus,
        result: ourResult,
        reject_message: rejectMessage,
      },
      document: ocrResult ? {
        full_name: ocrResult.full_name,
        id_number: ocrResult.front_document_number,
        id_number_back: ocrResult.back_document_number,
        address: ocrResult.front_document_address,
        gender: ocrResult.front_document_gender,
      } : null,
      verification: step1 || step2 ? {
        document_valid: step1?.status ?? false,
        name_match: textSimilarity?.name_similarity_status ? true : false,
        id_match: textSimilarity?.document_number_similarity_status ? true : false,
        front_back_match: textSimilarity?.front_back_number_similarity_status ? true : false,
        landmark_valid: landmarkStatus?.landmark_is_valid ?? false,
        face_match: step2?.is_identical ?? false,
        face_match_score: step2?.percentage ?? null,
        liveness_passed: step2?.status ?? false,
      } : null,
      images: presignedImages,
      images_uploaded: {
        front_document: !!s3FrontDocument,
        back_document: !!s3BackDocument,
        face_image: !!s3FaceImage,
        best_frame: !!s3BestFrame,
      },
    });
  } catch (error) {
    console.error("[Admin Refresh] Failed to fetch status from Innovatif:", error);
    return NextResponse.json({
      success: false,
      error: "Failed to fetch status from provider",
      details: error instanceof Error ? error.message : "Unknown error",
    }, { status: 502 });
  }
}
