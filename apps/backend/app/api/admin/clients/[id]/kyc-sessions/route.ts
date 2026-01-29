import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@truestack/shared/db";
import { auth } from "@/lib/auth";

// GET /api/admin/clients/:id/kyc-sessions - Get KYC sessions for a client
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: clientId } = await params;

    // Get query params for pagination
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;

    // Verify client exists
    const client = await queryOne<{ id: string }>(
      "SELECT id FROM client WHERE id = $1",
      [clientId]
    );

    if (!client) {
      return NextResponse.json(
        { error: "NOT_FOUND", message: "Client not found" },
        { status: 404 }
      );
    }

    // Get total count
    const countResult = await queryOne<{ count: string }>(
      "SELECT COUNT(*) as count FROM kyc_session WHERE client_id = $1",
      [clientId]
    );
    const total = parseInt(countResult?.count || "0");

    // Get sessions with pagination, ordered by created_at desc
    const sessions = await query<{
      id: string;
      ref_id: string;
      innovatif_ref_id: string | null;
      status: string;
      result: string | null;
      reject_message: string | null;
      document_name: string;
      document_number: string;
      document_type: string;
      billed: boolean;
      webhook_delivered: boolean;
      webhook_delivered_at: string | null;
      created_at: string;
      updated_at: string;
      expires_at: string | null;
    }>(
      `SELECT 
        id,
        ref_id,
        innovatif_ref_id,
        status,
        result,
        reject_message,
        document_name,
        document_number,
        document_type,
        billed,
        webhook_delivered,
        webhook_delivered_at,
        created_at,
        updated_at,
        expires_at
       FROM kyc_session 
       WHERE client_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [clientId, limit, offset]
    );

    return NextResponse.json({
      sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching KYC sessions:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}
