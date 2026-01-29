import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@truestack/shared/db";
import {
  generateInvoice,
  calculateBillingPeriod,
  queryUsageByTier,
  getUnpaidInvoices,
  getClientBalance,
} from "@truestack/shared/invoice";

const SST_RATE = 0.08; // 8% SST

// GET /api/admin/clients/:id/invoices - List client invoices
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const invoices = await query<{
      id: string;
      invoice_number: string;
      period_start: string;
      period_end: string;
      due_date: string;
      total_usage_credits: number;
      previous_balance_credits: number;
      amount_due_credits: number;
      amount_due_myr: string;
      sst_rate: string;
      sst_amount_myr: string;
      total_with_sst_myr: string;
      amount_paid_credits: number;
      amount_paid_myr: string;
      status: string;
      generated_at: string;
      generated_by_name: string | null;
    }>(
      `SELECT 
        i.id,
        i.invoice_number,
        i.period_start,
        i.period_end,
        i.due_date,
        i.total_usage_credits,
        i.previous_balance_credits,
        i.amount_due_credits,
        i.amount_due_myr,
        COALESCE(i.sst_rate, 0.08) as sst_rate,
        COALESCE(i.sst_amount_myr, ROUND(i.amount_due_myr * 0.08, 2)) as sst_amount_myr,
        COALESCE(i.total_with_sst_myr, ROUND(i.amount_due_myr * 1.08, 2)) as total_with_sst_myr,
        i.amount_paid_credits,
        i.amount_paid_myr,
        i.status,
        i.generated_at,
        u.name as generated_by_name
      FROM invoice i
      LEFT JOIN "user" u ON u.id = i.generated_by
      WHERE i.client_id = $1
      ORDER BY i.generated_at DESC`,
      [id]
    );

    return NextResponse.json({ invoices });
  } catch (error) {
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoices" },
      { status: 500 }
    );
  }
}

// POST /api/admin/clients/:id/invoices - Generate new invoice
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    const invoice = await generateInvoice(id, { generatedBy: userId });

    return NextResponse.json({ invoice });
  } catch (error) {
    console.error("Error generating invoice:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate invoice" },
      { status: 500 }
    );
  }
}
