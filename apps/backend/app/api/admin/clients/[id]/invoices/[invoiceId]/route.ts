import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@truestack/shared/db";
import { getInvoicePdfUrl } from "@truestack/shared/invoice";

// GET /api/admin/clients/:id/invoices/:invoiceId - Get invoice details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; invoiceId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId, invoiceId } = await params;

    // Get invoice with client validation
    const invoice = await queryOne<{
      id: string;
      client_id: string;
      invoice_number: string;
      period_start: string;
      period_end: string;
      due_date: string;
      total_usage_credits: number;
      previous_balance_credits: number;
      credit_balance_at_generation: number;
      amount_due_credits: number;
      amount_due_myr: string;
      amount_paid_credits: number;
      amount_paid_myr: string;
      s3_key: string;
      status: string;
      generated_at: string;
      generated_by_name: string | null;
      superseded_by_invoice_number: string | null;
    }>(`
      SELECT 
        i.id,
        i.client_id,
        i.invoice_number,
        i.period_start,
        i.period_end,
        i.due_date,
        i.total_usage_credits,
        i.previous_balance_credits,
        i.credit_balance_at_generation,
        i.amount_due_credits,
        i.amount_due_myr,
        i.amount_paid_credits,
        i.amount_paid_myr,
        i.s3_key,
        i.status,
        i.generated_at,
        u.name as generated_by_name,
        i2.invoice_number as superseded_by_invoice_number
      FROM invoice i
      LEFT JOIN "user" u ON u.id = i.generated_by
      LEFT JOIN invoice i2 ON i2.id = i.superseded_by_invoice_id
      WHERE i.id = $1 AND i.client_id = $2
    `, [invoiceId, clientId]);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Get line items
    const lineItems = await query<{
      id: string;
      line_type: string;
      product_id: string | null;
      tier_name: string | null;
      session_count: number | null;
      credits_per_session: number | null;
      reference_invoice_id: string | null;
      reference_invoice_number: string | null;
      total_credits: number;
      total_myr: string;
    }>(`
      SELECT 
        id,
        line_type,
        product_id,
        tier_name,
        session_count,
        credits_per_session,
        reference_invoice_id,
        reference_invoice_number,
        total_credits,
        total_myr
      FROM invoice_line_item
      WHERE invoice_id = $1
      ORDER BY line_type, product_id, tier_name
    `, [invoiceId]);

    // Get payments
    const payments = await query<{
      id: string;
      receipt_number: string;
      amount_credits: number;
      amount_myr: string;
      payment_date: string;
      payment_method: string | null;
      payment_reference: string | null;
      recorded_by_name: string | null;
      created_at: string;
    }>(`
      SELECT 
        p.id,
        p.receipt_number,
        p.amount_credits,
        p.amount_myr,
        p.payment_date,
        p.payment_method,
        p.payment_reference,
        u.name as recorded_by_name,
        p.created_at
      FROM payment p
      LEFT JOIN "user" u ON u.id = p.recorded_by
      WHERE p.invoice_id = $1
      ORDER BY p.payment_date DESC
    `, [invoiceId]);

    // Get presigned URL for PDF
    let pdfUrl: string | null = null;
    try {
      pdfUrl = await getInvoicePdfUrl(invoiceId);
    } catch {
      // PDF may not exist yet or S3 error
    }

    return NextResponse.json({
      invoice,
      lineItems,
      payments,
      pdfUrl,
    });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json(
      { error: "Failed to fetch invoice" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/clients/:id/invoices/:invoiceId - Update invoice (void)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; invoiceId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId, invoiceId } = await params;
    const body = await request.json();
    const { status } = body;

    // Only allow voiding
    if (status !== "void") {
      return NextResponse.json(
        { error: "Only 'void' status update is allowed" },
        { status: 400 }
      );
    }

    // Get invoice
    const invoice = await queryOne<{
      id: string;
      status: string;
      amount_paid_credits: number;
    }>(`
      SELECT id, status, amount_paid_credits
      FROM invoice
      WHERE id = $1 AND client_id = $2
    `, [invoiceId, clientId]);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Cannot void paid or superseded invoices
    if (invoice.status === "paid") {
      return NextResponse.json(
        { error: "Cannot void a paid invoice" },
        { status: 400 }
      );
    }

    if (invoice.status === "superseded") {
      return NextResponse.json(
        { error: "Cannot void a superseded invoice" },
        { status: 400 }
      );
    }

    if (invoice.amount_paid_credits > 0) {
      return NextResponse.json(
        { error: "Cannot void an invoice with payments. Record a refund instead." },
        { status: 400 }
      );
    }

    // Void the invoice
    await query(`
      UPDATE invoice 
      SET status = 'void', updated_at = NOW()
      WHERE id = $1
    `, [invoiceId]);

    return NextResponse.json({ success: true, status: "void" });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}
