import { NextRequest, NextResponse } from "next/server";
import { queryOne } from "@truestack/shared/db";
import { getPresignedUrl } from "@truestack/shared/s3";

const VALID_TYPES = ["front_document", "back_document", "face_image", "best_frame"] as const;

function verifyInternalAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  const internalKey = process.env.INTERNAL_API_KEY;
  const kreditSecret = process.env.KREDIT_INTERNAL_SECRET;
  return (!!internalKey && token === internalKey) || (!!kreditSecret && token === kreditSecret);
}

// GET /api/internal/kredit/sessions/:sessionId/documents/:type
// Returns redirect to presigned S3 URL for the document image.
// Auth: Authorization: Bearer {KREDIT_INTERNAL_SECRET} or {INTERNAL_API_KEY}
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; type: string }> }
) {
  try {
    if (!verifyInternalAuth(request)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId, type } = await params;

    if (!VALID_TYPES.includes(type as (typeof VALID_TYPES)[number])) {
      return NextResponse.json(
        { error: "BAD_REQUEST", message: `Invalid type. Valid: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    const s3Column = `s3_${type}`;
    const session = await queryOne<{
      id: string;
      client_id: string;
      s3_path: string | null;
      client_source: string | null;
    }>(
      `SELECT ks.id, ks.client_id, ks.${s3Column} as s3_path, COALESCE(c.client_source, 'api') as client_source
       FROM kyc_session ks
       JOIN client c ON c.id = ks.client_id
       WHERE ks.id = $1`,
      [sessionId]
    );

    if (!session) {
      return NextResponse.json({ error: "NOT_FOUND", message: "Session not found" }, { status: 404 });
    }

    if (session.client_source !== "truestack_kredit") {
      return NextResponse.json(
        { error: "FORBIDDEN", message: "Session is not a Kredit tenant session" },
        { status: 403 }
      );
    }

    if (!session.s3_path) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Document not available" },
        { status: 404 }
      );
    }

    const presignedUrl = await getPresignedUrl(session.s3_path, 3600); // 1 hour
    return NextResponse.redirect(presignedUrl);
  } catch (error) {
    console.error("[Kredit Document] Error:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}
