import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@truestack/shared/db";
import { auth } from "@/lib/auth";

// GET /api/admin/kyc-usage - Get consolidated usage stats across all clients
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

    // Get overall stats
    const stats = await queryOne<{
      total_sessions: string;
      approved_sessions: string;
      rejected_sessions: string;
      pending_sessions: string;
      processing_sessions: string;
      expired_sessions: string;
      billed_total: string;
      billed_mtd: string;
    }>(`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(*) FILTER (WHERE status = 'completed' AND result = 'approved') as approved_sessions,
        COUNT(*) FILTER (WHERE status = 'completed' AND result = 'rejected') as rejected_sessions,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_sessions,
        COUNT(*) FILTER (WHERE status = 'processing') as processing_sessions,
        COUNT(*) FILTER (WHERE status = 'expired') as expired_sessions,
        COUNT(*) FILTER (WHERE billed = true) as billed_total,
        COUNT(*) FILTER (
          WHERE billed = true
            AND updated_at >= date_trunc('month', NOW() AT TIME ZONE 'Asia/Kuala_Lumpur') AT TIME ZONE 'Asia/Kuala_Lumpur'
            AND updated_at < (date_trunc('month', NOW() AT TIME ZONE 'Asia/Kuala_Lumpur') + INTERVAL '1 month') AT TIME ZONE 'Asia/Kuala_Lumpur'
        ) as billed_mtd
      FROM kyc_session
    `);

    // Get usage by client
    const clientUsage = await query<{
      client_id: string;
      client_name: string;
      client_code: string;
      total_sessions: string;
      approved_sessions: string;
      rejected_sessions: string;
      pending_sessions: string;
      billed_total: string;
      billed_mtd: string;
      credit_balance: string;
    }>(`
      SELECT 
        c.id as client_id,
        c.name as client_name,
        c.code as client_code,
        COUNT(ks.id) as total_sessions,
        COUNT(ks.id) FILTER (WHERE ks.status = 'completed' AND ks.result = 'approved') as approved_sessions,
        COUNT(ks.id) FILTER (WHERE ks.status = 'completed' AND ks.result = 'rejected') as rejected_sessions,
        COUNT(ks.id) FILTER (WHERE ks.status = 'pending' OR ks.status = 'processing') as pending_sessions,
        COUNT(ks.id) FILTER (WHERE ks.billed = true) as billed_total,
        COUNT(ks.id) FILTER (
          WHERE ks.billed = true
            AND ks.updated_at >= date_trunc('month', NOW() AT TIME ZONE 'Asia/Kuala_Lumpur') AT TIME ZONE 'Asia/Kuala_Lumpur'
            AND ks.updated_at < (date_trunc('month', NOW() AT TIME ZONE 'Asia/Kuala_Lumpur') + INTERVAL '1 month') AT TIME ZONE 'Asia/Kuala_Lumpur'
        ) as billed_mtd,
        COALESCE((
          SELECT balance_after FROM credit_ledger 
          WHERE client_id = c.id AND product_id = 'true_identity'
          ORDER BY created_at DESC LIMIT 1
        ), 0) as credit_balance
      FROM client c
      LEFT JOIN kyc_session ks ON ks.client_id = c.id
      GROUP BY c.id, c.name, c.code
      HAVING COUNT(ks.id) > 0
      ORDER BY COUNT(ks.id) DESC
    `);

    // Calculate total credits balance
    const totalCredits = await queryOne<{ total_balance: string }>(`
      SELECT COALESCE(SUM(balance), 0) as total_balance
      FROM (
        SELECT DISTINCT ON (client_id) balance_after as balance
        FROM credit_ledger
        WHERE product_id = 'true_identity'
        ORDER BY client_id, created_at DESC
      ) latest_balances
    `);

    return NextResponse.json({
      stats: {
        totalSessions: parseInt(stats?.total_sessions || "0"),
        approvedSessions: parseInt(stats?.approved_sessions || "0"),
        rejectedSessions: parseInt(stats?.rejected_sessions || "0"),
        pendingSessions: parseInt(stats?.pending_sessions || "0"),
        processingSessions: parseInt(stats?.processing_sessions || "0"),
        expiredSessions: parseInt(stats?.expired_sessions || "0"),
        billedTotal: parseInt(stats?.billed_total || "0"),
        billedMtd: parseInt(stats?.billed_mtd || "0"),
        totalCreditsBalance: parseInt(totalCredits?.total_balance || "0"),
      },
      clientUsage: clientUsage.map((cu) => ({
        clientId: cu.client_id,
        clientName: cu.client_name,
        clientCode: cu.client_code,
        totalSessions: parseInt(cu.total_sessions),
        approvedSessions: parseInt(cu.approved_sessions),
        rejectedSessions: parseInt(cu.rejected_sessions),
        pendingSessions: parseInt(cu.pending_sessions),
        billedTotal: parseInt(cu.billed_total),
        billedMtd: parseInt(cu.billed_mtd),
        creditBalance: parseInt(cu.credit_balance),
      })),
    });
  } catch (error) {
    console.error("Error fetching KYC usage:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}
