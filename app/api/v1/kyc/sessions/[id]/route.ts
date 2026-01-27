import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { hashApiKey } from "@/lib/api-keys";

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
      const baseUrl = process.env.BETTER_AUTH_URL || "http://localhost:3000";
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
