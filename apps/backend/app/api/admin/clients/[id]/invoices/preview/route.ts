import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@truestack/shared/db";
import { calculateBillingPeriod, getClientBalance, getUnpaidInvoices, queryUsageByTier } from "@truestack/shared/invoice";

// GET /api/admin/clients/:id/invoices/preview - Preview invoice before generating
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId } = await params;
    const { searchParams } = new URL(request.url);
    const endDateParam = searchParams.get("endDate");

    // Verify client exists
    const client = await queryOne<{ id: string; name: string; code: string }>(
      "SELECT id, name, code FROM client WHERE id = $1",
      [clientId]
    );

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Calculate end date (default to yesterday)
    let endDate: Date;
    if (endDateParam) {
      endDate = new Date(endDateParam);
    } else {
      endDate = new Date();
      endDate.setDate(endDate.getDate() - 1);
    }

    // Get billing period
    let billingPeriod;
    try {
      billingPeriod = await calculateBillingPeriod(clientId, endDate);
    } catch (error) {
      return NextResponse.json({
        canGenerate: false,
        reason: error instanceof Error ? error.message : "Cannot calculate billing period",
      });
    }

    // Check if period is valid
    if (billingPeriod.periodStart > billingPeriod.periodEnd) {
      return NextResponse.json({
        canGenerate: false,
        reason: "No billable period available. The last invoice already covers up to this date.",
      });
    }

    // Get usage by tier
    const usage = await queryUsageByTier(clientId, billingPeriod.periodStart, billingPeriod.periodEnd);
    const totalUsageCredits = usage.reduce((sum, u) => sum + u.totalCredits, 0);

    // Get unpaid invoices
    const unpaidInvoices = await getUnpaidInvoices(clientId);
    const previousBalanceCredits = unpaidInvoices.reduce((sum, inv) => sum + inv.unpaidCredits, 0);

    // Get current balance
    const currentBalance = await getClientBalance(clientId);

    // Calculate amount due
    const amountDueCredits = Math.max(0, -currentBalance);
    const amountDueMyr = amountDueCredits / 10;

    return NextResponse.json({
      canGenerate: true,
      preview: {
        client: {
          name: client.name,
          code: client.code,
        },
        periodStart: billingPeriod.periodStart,
        periodEnd: billingPeriod.periodEnd,
        usage,
        totalUsageCredits,
        unpaidInvoices,
        previousBalanceCredits,
        currentBalance,
        amountDueCredits,
        amountDueMyr,
      },
    });
  } catch (error) {
    console.error("Error previewing invoice:", error);
    return NextResponse.json(
      { error: "Failed to preview invoice" },
      { status: 500 }
    );
  }
}
