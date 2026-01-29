import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@truestack/shared/db";
import { auth } from "@/lib/auth";

// GET /api/admin/dashboard/stats - Get dashboard statistics
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json(
        { error: "UNAUTHORIZED", message: "Not authenticated" },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "daily"; // daily or monthly
    const days = period === "monthly" ? 365 : 30;

    // Get overall stats
    const overallStats = await queryOne<{
      total_clients: string;
      active_clients: string;
      total_sessions: string;
      approved_sessions: string;
      rejected_sessions: string;
      pending_sessions: string;
      total_credits_used: string;
      billed_mtd: string;
    }>(`
      SELECT
        (SELECT COUNT(*) FROM client) as total_clients,
        (SELECT COUNT(*) FROM client WHERE status = 'active') as active_clients,
        (SELECT COUNT(*) FROM kyc_session) as total_sessions,
        (SELECT COUNT(*) FROM kyc_session WHERE status = 'completed' AND result = 'approved') as approved_sessions,
        (SELECT COUNT(*) FROM kyc_session WHERE status = 'completed' AND result = 'rejected') as rejected_sessions,
        (SELECT COUNT(*) FROM kyc_session WHERE status IN ('pending', 'processing')) as pending_sessions,
        (SELECT COALESCE(SUM(ABS(amount)), 0) FROM credit_ledger WHERE amount < 0) as total_credits_used,
        (SELECT COUNT(*) FROM kyc_session 
         WHERE billed = true 
         AND updated_at >= date_trunc('month', NOW() AT TIME ZONE 'Asia/Kuala_Lumpur') AT TIME ZONE 'Asia/Kuala_Lumpur'
        ) as billed_mtd
    `);

    // Calculate success rate
    const totalCompleted =
      parseInt(overallStats?.approved_sessions || "0") +
      parseInt(overallStats?.rejected_sessions || "0");
    const successRate =
      totalCompleted > 0
        ? Math.round(
            (parseInt(overallStats?.approved_sessions || "0") / totalCompleted) * 100
          )
        : 0;

    // Get time series data based on period
    let timeSeriesQuery: string;
    if (period === "monthly") {
      timeSeriesQuery = `
        SELECT 
          to_char(date_trunc('month', created_at AT TIME ZONE 'Asia/Kuala_Lumpur'), 'Mon YYYY') as label,
          date_trunc('month', created_at AT TIME ZONE 'Asia/Kuala_Lumpur') as date,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'completed' AND result = 'approved') as approved,
          COUNT(*) FILTER (WHERE status = 'completed' AND result = 'rejected') as rejected,
          COUNT(*) FILTER (WHERE billed = true) as billed
        FROM kyc_session
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY date_trunc('month', created_at AT TIME ZONE 'Asia/Kuala_Lumpur')
        ORDER BY date ASC
      `;
    } else {
      timeSeriesQuery = `
        SELECT 
          to_char(date_trunc('day', created_at AT TIME ZONE 'Asia/Kuala_Lumpur'), 'DD Mon') as label,
          date_trunc('day', created_at AT TIME ZONE 'Asia/Kuala_Lumpur') as date,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'completed' AND result = 'approved') as approved,
          COUNT(*) FILTER (WHERE status = 'completed' AND result = 'rejected') as rejected,
          COUNT(*) FILTER (WHERE billed = true) as billed
        FROM kyc_session
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY date_trunc('day', created_at AT TIME ZONE 'Asia/Kuala_Lumpur')
        ORDER BY date ASC
      `;
    }

    const sessionsTimeSeries = await query<{
      label: string;
      date: string;
      total: string;
      approved: string;
      rejected: string;
      billed: string;
    }>(timeSeriesQuery);

    // Get credits/billing time series
    let creditsTimeSeriesQuery: string;
    if (period === "monthly") {
      creditsTimeSeriesQuery = `
        SELECT 
          to_char(date_trunc('month', created_at AT TIME ZONE 'Asia/Kuala_Lumpur'), 'Mon YYYY') as label,
          date_trunc('month', created_at AT TIME ZONE 'Asia/Kuala_Lumpur') as date,
          COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as credits_added,
          COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as credits_used
        FROM credit_ledger
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY date_trunc('month', created_at AT TIME ZONE 'Asia/Kuala_Lumpur')
        ORDER BY date ASC
      `;
    } else {
      creditsTimeSeriesQuery = `
        SELECT 
          to_char(date_trunc('day', created_at AT TIME ZONE 'Asia/Kuala_Lumpur'), 'DD Mon') as label,
          date_trunc('day', created_at AT TIME ZONE 'Asia/Kuala_Lumpur') as date,
          COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) as credits_added,
          COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) as credits_used
        FROM credit_ledger
        WHERE created_at >= NOW() - INTERVAL '${days} days'
        GROUP BY date_trunc('day', created_at AT TIME ZONE 'Asia/Kuala_Lumpur')
        ORDER BY date ASC
      `;
    }

    const creditsTimeSeries = await query<{
      label: string;
      date: string;
      credits_added: string;
      credits_used: string;
    }>(creditsTimeSeriesQuery);

    // Get recent sessions
    const recentSessions = await query<{
      id: string;
      client_name: string;
      status: string;
      result: string | null;
      document_name: string;
      created_at: string;
    }>(`
      SELECT 
        ks.id,
        c.name as client_name,
        ks.status,
        ks.result,
        ks.document_name,
        ks.created_at
      FROM kyc_session ks
      JOIN client c ON c.id = ks.client_id
      ORDER BY ks.created_at DESC
      LIMIT 5
    `);

    // Get recent clients
    const recentClients = await query<{
      id: string;
      name: string;
      code: string;
      status: string;
      created_at: string;
    }>(`
      SELECT id, name, code, status, created_at
      FROM client
      ORDER BY created_at DESC
      LIMIT 5
    `);

    return NextResponse.json({
      overview: {
        totalClients: parseInt(overallStats?.total_clients || "0"),
        activeClients: parseInt(overallStats?.active_clients || "0"),
        totalSessions: parseInt(overallStats?.total_sessions || "0"),
        approvedSessions: parseInt(overallStats?.approved_sessions || "0"),
        rejectedSessions: parseInt(overallStats?.rejected_sessions || "0"),
        pendingSessions: parseInt(overallStats?.pending_sessions || "0"),
        totalCreditsUsed: parseInt(overallStats?.total_credits_used || "0"),
        billedMtd: parseInt(overallStats?.billed_mtd || "0"),
        successRate,
      },
      sessionsChart: sessionsTimeSeries.map((row) => ({
        label: row.label,
        total: parseInt(row.total),
        approved: parseInt(row.approved),
        rejected: parseInt(row.rejected),
        billed: parseInt(row.billed),
      })),
      creditsChart: creditsTimeSeries.map((row) => ({
        label: row.label,
        added: parseInt(row.credits_added),
        used: parseInt(row.credits_used),
      })),
      recentSessions,
      recentClients,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "SERVER_ERROR", message: "Internal server error" },
      { status: 500 }
    );
  }
}
