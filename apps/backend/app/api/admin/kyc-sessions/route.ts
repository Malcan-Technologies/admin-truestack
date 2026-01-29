import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@truestack/shared/db";
import { auth } from "@/lib/auth";

// GET /api/admin/kyc-sessions - Get all KYC sessions across all clients
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    // Get query params for pagination and filtering
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const clientId = searchParams.get("clientId") || "";

    // Build WHERE clause
    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(
        `(ks.document_name ILIKE $${paramIndex} OR ks.document_number ILIKE $${paramIndex} OR ks.ref_id ILIKE $${paramIndex})`
      );
      params.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      if (status === "approved") {
        conditions.push(`ks.status = 'completed' AND ks.result = 'approved'`);
      } else if (status === "rejected") {
        conditions.push(`ks.status = 'completed' AND ks.result = 'rejected'`);
      } else {
        conditions.push(`ks.status = $${paramIndex}`);
        params.push(status);
        paramIndex++;
      }
    }

    if (clientId) {
      conditions.push(`ks.client_id = $${paramIndex}`);
      params.push(clientId);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    // Get total count
    const countResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM kyc_session ks ${whereClause}`,
      params
    );
    const total = parseInt(countResult?.count || "0");

    // Get sessions with pagination, ordered by created_at desc
    const sessionsParams = [...params, limit, offset];
    const sessions = await query<{
      id: string;
      client_id: string;
      client_name: string;
      client_code: string;
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
        ks.id,
        ks.client_id,
        c.name as client_name,
        c.code as client_code,
        ks.ref_id,
        ks.innovatif_ref_id,
        ks.status,
        ks.result,
        ks.reject_message,
        ks.document_name,
        ks.document_number,
        ks.document_type,
        ks.billed,
        ks.webhook_delivered,
        ks.webhook_delivered_at,
        ks.created_at,
        ks.updated_at,
        ks.expires_at
       FROM kyc_session ks
       JOIN client c ON c.id = ks.client_id
       ${whereClause}
       ORDER BY ks.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      sessionsParams
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
