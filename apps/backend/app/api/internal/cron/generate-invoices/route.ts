import { NextRequest, NextResponse } from "next/server";
import { generateAllMonthlyInvoices } from "@truestack/shared/invoice";

// POST /api/internal/cron/generate-invoices - Generate all monthly invoices
// This endpoint is called by the cron job and protected by an internal API key
export async function POST(request: NextRequest) {
  try {
    // Verify internal API key
    const authHeader = request.headers.get("authorization");
    const expectedKey = process.env.INTERNAL_API_KEY;

    if (!expectedKey) {
      console.error("INTERNAL_API_KEY not configured");
      return NextResponse.json({ error: "Server misconfigured" }, { status: 500 });
    }

    if (authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[Cron] Starting monthly invoice generation...");
    const startTime = Date.now();

    const result = await generateAllMonthlyInvoices();

    const duration = Date.now() - startTime;
    console.log(`[Cron] Invoice generation complete in ${duration}ms:`, {
      success: result.success,
      failed: result.failed,
    });

    if (result.errors.length > 0) {
      console.error("[Cron] Invoice generation errors:", result.errors);
    }

    return NextResponse.json({
      ...result,
      completed: true,
      duration,
    });
  } catch (error) {
    console.error("[Cron] Invoice generation failed:", error);
    return NextResponse.json(
      { error: "Invoice generation failed" },
      { status: 500 }
    );
  }
}

// Allow GET for health check
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/internal/cron/generate-invoices",
    method: "POST",
    description: "Generate monthly invoices for all active clients",
    schedule: "1st of each month at 1:00 AM MYT",
  });
}
