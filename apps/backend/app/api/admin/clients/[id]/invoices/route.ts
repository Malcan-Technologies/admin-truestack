import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@truestack/shared/db";
import { generateInvoice, calculateBillingPeriod, getClientBalance, getUnpaidInvoices, queryUsageByTier } from "@truestack/shared/invoice";

// GET /api/admin/clients/:id/invoices - List invoices for client
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

    // Verify client exists
    const client = await queryOne<{ id: string }>(
      "SELECT id FROM client WHERE id = $1",
      [clientId]
    );

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Get invoices with line items count
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
      amount_paid_credits: number;
      amount_paid_myr: string;
      status: string;
      generated_at: string;
      generated_by_name: string | null;
    }>(`
      SELECT 
        i.id,
        i.invoice_number,
        i.period_start,
        i.period_end,
        i.due_date,
        i.total_usage_credits,
        i.previous_balance_credits,
        i.amount_due_credits,
        i.amount_due_myr,
        i.amount_paid_credits,
        i.amount_paid_myr,
        i.status,
        i.generated_at,
        u.name as generated_by_name
      FROM invoice i
      LEFT JOIN "user" u ON u.id = i.generated_by
      WHERE i.client_id = $1
      ORDER BY i.period_end DESC, i.generated_at DESC
    `, [clientId]);

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

    const { id: clientId } = await params;

    // Verify client exists
    const client = await queryOne<{ id: string; status: string }>(
      "SELECT id, status FROM client WHERE id = $1",
      [clientId]
    );

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Parse optional end date from body
    const body = await request.json().catch(() => ({}));
    const endDate = body.endDate ? new Date(body.endDate) : undefined;

    // Generate the invoice
    const invoice = await generateInvoice(clientId, {
      endDate,
      generatedBy: session.user.id,
    });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (error) {
    console.error("Error generating invoice:", error);
    const message = error instanceof Error ? error.message : "Failed to generate invoice";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// GET /api/admin/clients/:id/invoices/preview - Preview invoice before generating
export async function OPTIONS(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // This is a workaround - we'll actually use a different endpoint for preview
  return NextResponse.json({});
}
