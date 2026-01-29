import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@truestack/shared/db";
import { auth } from "@/lib/auth";
import { getPresignedUrls } from "@truestack/shared/s3";

// GET /api/admin/kyc-sessions/:sessionId - Get KYC session details (admin view - no client restriction)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    // Check authentication
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const { sessionId } = await params;

    // Get session details with client info
    const kycSession = await queryOne<{
      id: string;
      client_id: string;
      client_name: string;
      client_code: string;
      ref_id: string;
      innovatif_ref_id: string | null;
      innovatif_onboarding_id: string | null;
      status: string;
      result: string | null;
      reject_message: string | null;
      document_name: string;
      document_number: string;
      document_type: string;
      platform: string;
      success_url: string | null;
      fail_url: string | null;
      webhook_url: string | null;
      metadata: Record<string, unknown>;
      innovatif_response: Record<string, unknown> | null;
      s3_front_document: string | null;
      s3_back_document: string | null;
      s3_face_image: string | null;
      s3_best_frame: string | null;
      webhook_delivered: boolean;
      webhook_delivered_at: string | null;
      webhook_attempts: number;
      webhook_last_error: string | null;
      billed: boolean;
      expires_at: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT 
        ks.id,
        ks.client_id,
        c.name as client_name,
        c.code as client_code,
        ks.ref_id,
        ks.innovatif_ref_id,
        ks.innovatif_onboarding_id,
        ks.status,
        ks.result,
        ks.reject_message,
        ks.document_name,
        ks.document_number,
        ks.document_type,
        ks.platform,
        ks.success_url,
        ks.fail_url,
        ks.webhook_url,
        ks.metadata,
        ks.innovatif_response,
        ks.s3_front_document,
        ks.s3_back_document,
        ks.s3_face_image,
        ks.s3_best_frame,
        ks.webhook_delivered,
        ks.webhook_delivered_at,
        ks.webhook_attempts,
        ks.webhook_last_error,
        ks.billed,
        ks.expires_at,
        ks.created_at,
        ks.updated_at
       FROM kyc_session ks
       JOIN client c ON c.id = ks.client_id
       WHERE ks.id = $1`,
      [sessionId]
    );

    if (!kycSession) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Session not found" },
        { status: 404 }
      );
    }

    // Generate presigned URLs for images if they exist
    let images: {
      front_document?: string;
      back_document?: string;
      face_image?: string;
      best_frame?: string;
    } | null = null;

    const s3Keys = [
      kycSession.s3_front_document,
      kycSession.s3_back_document,
      kycSession.s3_face_image,
      kycSession.s3_best_frame,
    ].filter(Boolean) as string[];

    if (s3Keys.length > 0) {
      try {
        const presignedUrls = await getPresignedUrls(s3Keys);
        images = {
          front_document: kycSession.s3_front_document ? presignedUrls[kycSession.s3_front_document] : undefined,
          back_document: kycSession.s3_back_document ? presignedUrls[kycSession.s3_back_document] : undefined,
          face_image: kycSession.s3_face_image ? presignedUrls[kycSession.s3_face_image] : undefined,
          best_frame: kycSession.s3_best_frame ? presignedUrls[kycSession.s3_best_frame] : undefined,
        };
      } catch (error) {
        console.error("Error generating presigned URLs:", error);
        // Continue without images on error
      }
    }

    // Extract verification data from innovatif_response
    let verification: Record<string, unknown> | null = null;
    let document: Record<string, unknown> | null = null;

    if (kycSession.innovatif_response) {
      const resp = kycSession.innovatif_response;
      
      // Document OCR data
      document = {
        full_name: resp.full_name || resp.name || null,
        id_number: resp.id_number || null,
        id_number_back: resp.id_number_back || null,
        address: resp.address || null,
        gender: resp.gender || null,
        dob: resp.dob || null,
        nationality: resp.nationality || null,
        religion: resp.religion || null,
        race: resp.race || null,
      };

      // Verification results
      verification = {
        document_valid: resp.is_document_valid ?? null,
        name_match: resp.is_name_match ?? null,
        id_match: resp.is_id_match ?? null,
        front_back_match: resp.is_front_back_match ?? null,
        landmark_valid: resp.is_landmark_valid ?? null,
        face_match: resp.is_facematch ?? null,
        face_match_score: resp.face_match_score ?? resp.facematch_score ?? null,
        liveness_passed: resp.is_liveness ?? null,
      };
    }

    return NextResponse.json({
      id: kycSession.id,
      client_id: kycSession.client_id,
      client_name: kycSession.client_name,
      client_code: kycSession.client_code,
      ref_id: kycSession.ref_id,
      innovatif_ref_id: kycSession.innovatif_ref_id,
      innovatif_onboarding_id: kycSession.innovatif_onboarding_id,
      status: kycSession.status,
      result: kycSession.result,
      reject_message: kycSession.reject_message,
      document_name: kycSession.document_name,
      document_number: kycSession.document_number,
      document_type: kycSession.document_type,
      platform: kycSession.platform,
      webhook_url: kycSession.webhook_url,
      metadata: kycSession.metadata,
      billed: kycSession.billed,
      webhook_delivered: kycSession.webhook_delivered,
      webhook_delivered_at: kycSession.webhook_delivered_at,
      webhook_attempts: kycSession.webhook_attempts,
      webhook_last_error: kycSession.webhook_last_error,
      expires_at: kycSession.expires_at,
      created_at: kycSession.created_at,
      updated_at: kycSession.updated_at,
      // Structured data extracted from innovatif_response
      document,
      verification,
      images,
      // Raw innovatif response for debugging
      _raw: kycSession.innovatif_response,
    });
  } catch (error) {
    console.error("Error fetching KYC session:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}
