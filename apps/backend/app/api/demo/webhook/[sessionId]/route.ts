import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@truestack/shared/db";

// GET /api/demo/webhook/[sessionId] - Get webhooks for a specific session
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    // Get webhooks for this session
    const webhooks = await query<{
      id: string;
      session_id: string;
      event: string;
      payload: Record<string, unknown>;
      received_at: string;
    }>(
      `SELECT id, session_id, event, payload, received_at
       FROM demo_webhook
       WHERE session_id = $1
       ORDER BY received_at DESC`,
      [sessionId]
    );

    // Also get the session details
    const session = await queryOne<{
      id: string;
      ref_id: string;
      status: string;
      result: string | null;
      reject_message: string | null;
      document_name: string;
      document_number: string;
      document_type: string;
      innovatif_response: Record<string, unknown> | null;
      s3_front_document: string | null;
      s3_back_document: string | null;
      s3_face_image: string | null;
      s3_best_frame: string | null;
      webhook_delivered: boolean;
      webhook_delivered_at: string | null;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT 
        id, ref_id, status, result, reject_message, 
        document_name, document_number, document_type,
        innovatif_response, 
        s3_front_document, s3_back_document, s3_face_image, s3_best_frame,
        webhook_delivered, webhook_delivered_at,
        created_at, updated_at
       FROM kyc_session
       WHERE id = $1`,
      [sessionId]
    );

    return NextResponse.json({
      session,
      webhooks,
    });
  } catch (error) {
    console.error("Error fetching session webhooks:", error);
    return NextResponse.json(
      { error: "Failed to fetch session webhooks" },
      { status: 500 }
    );
  }
}
