import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@truestack/shared/db";
import {
  calculateBillingPeriod,
  queryUsageByTier,
  getUnpaidInvoices,
  getClientBalance,
} from "@truestack/shared/invoice";

const SST_RATE = 0.08; // 8% SST
const CREDITS_PER_MYR = 10;
const MALAYSIA_OFFSET_MS = 8 * 60 * 60 * 1000;

function getMalaysiaTodayStartUTC(): Date {
  const now = new Date();
  const malaysiaTime = new Date(now.getTime() + MALAYSIA_OFFSET_MS);
  const malaysiaDateStr = malaysiaTime.toISOString().split("T")[0];
  const midnightMalaysiaAsUTC = new Date(malaysiaDateStr + "T00:00:00.000Z");
  return new Date(midnightMalaysiaAsUTC.getTime() - MALAYSIA_OFFSET_MS);
}

function getMalaysiaYesterdayEndUTC(): Date {
  const todayStart = getMalaysiaTodayStartUTC();
  return new Date(todayStart.getTime() - 1);
}

// GET /api/admin/clients/:id/invoices/preview - Preview invoice before generation
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

    // Check for pending invoices that might block generation
    const pendingInvoice = await queryOne<{ id: string }>(
      `SELECT id FROM invoice WHERE client_id = $1 AND status = 'pending'`,
      [clientId]
    );

    if (pendingInvoice) {
      return NextResponse.json({
        canGenerate: false,
        reason: "A previous invoice generation is still pending. Please wait or clean up stuck invoices.",
      });
    }

    // Get client details
    const client = await queryOne<{ name: string; code: string }>(
      `SELECT name, code FROM client WHERE id = $1`,
      [clientId]
    );

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Calculate billing period
    const endDate = getMalaysiaYesterdayEndUTC();
    let billingPeriod;
    try {
      billingPeriod = await calculateBillingPeriod(clientId, endDate);
    } catch (error) {
      return NextResponse.json({
        canGenerate: false,
        reason: error instanceof Error ? error.message : "Failed to calculate billing period",
      });
    }

    const { periodStart, periodEnd } = billingPeriod;

    // Check if period is valid
    if (periodStart > periodEnd) {
      return NextResponse.json({
        canGenerate: false,
        reason: "No billable period available. The billing period has already been invoiced.",
      });
    }

    // Get usage by tier
    const usage = await queryUsageByTier(clientId, periodStart, periodEnd);
    const totalUsageCredits = usage.reduce((sum, u) => sum + u.totalCredits, 0);

    // Get unpaid invoices
    const unpaidInvoices = await getUnpaidInvoices(clientId);
    const previousBalanceCredits = unpaidInvoices.reduce((sum, inv) => sum + inv.unpaidCredits, 0);

    // Get current balance
    const currentBalance = await getClientBalance(clientId);

    // Calculate amount due
    const amountDueCredits = Math.max(0, -currentBalance);
    const amountDueMyr = amountDueCredits / CREDITS_PER_MYR;

    // Calculate SST
    const sstAmountMyr = Math.round(amountDueMyr * SST_RATE * 100) / 100;
    const totalWithSstMyr = Math.round((amountDueMyr + sstAmountMyr) * 100) / 100;

    return NextResponse.json({
      canGenerate: true,
      preview: {
        client: {
          name: client.name,
          code: client.code,
        },
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        usage,
        totalUsageCredits,
        unpaidInvoices,
        previousBalanceCredits,
        currentBalance,
        amountDueCredits,
        amountDueMyr,
        sstRate: SST_RATE,
        sstAmountMyr,
        totalWithSstMyr,
      },
    });
  } catch (error) {
    console.error("Error generating invoice preview:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice preview" },
      { status: 500 }
    );
  }
}
