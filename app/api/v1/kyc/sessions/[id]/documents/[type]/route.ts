import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@/lib/db";
import { hashApiKey } from "@/lib/api-keys";
import { getKycDocument, DocumentType } from "@/lib/s3";

const VALID_DOCUMENT_TYPES: DocumentType[] = [
  "front_document",
  "back_document",
  "face_image",
  "best_frame",
];

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

// GET /v1/kyc/sessions/:id/documents/:type
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; type: string }> }
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

    const { id, type } = await params;

    // Validate document type
    if (!VALID_DOCUMENT_TYPES.includes(type as DocumentType)) {
      return NextResponse.json(
        {
          error: "BAD_REQUEST",
          message: `Invalid document type. Valid types: ${VALID_DOCUMENT_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Get session and verify ownership
    const s3Column = `s3_${type}`;
    const session = await queryOne<{
      id: string;
      client_id: string;
      s3_path: string | null;
    }>(
      `SELECT id, client_id, ${s3Column} as s3_path FROM kyc_session WHERE id = $1`,
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

    // Check if document exists
    if (!session.s3_path) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Document not available" },
        { status: 404 }
      );
    }

    // Fetch document from S3
    try {
      const imageBuffer = await getKycDocument(session.s3_path);

      // Convert Buffer to Uint8Array for NextResponse compatibility
      return new NextResponse(new Uint8Array(imageBuffer), {
        status: 200,
        headers: {
          "Content-Type": "image/jpeg",
          "Content-Length": imageBuffer.length.toString(),
          "Cache-Control": "private, max-age=3600",
        },
      });
    } catch (s3Error) {
      console.error("S3 fetch error:", s3Error);
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Document not available" },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error("Error fetching document:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}
