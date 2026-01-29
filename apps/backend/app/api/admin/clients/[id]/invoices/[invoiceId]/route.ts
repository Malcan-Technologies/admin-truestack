import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne, execute } from "@truestack/shared/db";
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

    const { id, invoiceId } = await params;

    const invoice = await queryOne<{
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
      s3_key: string;
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
        i.s3_key
      FROM invoice i
      WHERE i.id = $1 AND i.client_id = $2`,
      [invoiceId, id]
    );

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Get PDF URL
    let pdfUrl: string | null = null;
    if (invoice.s3_key) {
      try {
        pdfUrl = await getInvoicePdfUrl(invoiceId);
      } catch (error) {
        console.error("Error getting PDF URL:", error);
      }
    }

    return NextResponse.json({
      invoice,
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

// PATCH /api/admin/clients/:id/invoices/:invoiceId - Update invoice (e.g., void)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; invoiceId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, invoiceId } = await params;
    const body = await request.json();
    const { status } = body;

    if (status === "void") {
      // Check if invoice can be voided (no payments)
      const invoice = await queryOne<{
        amount_paid_credits: number;
        status: string;
      }>(
        `SELECT amount_paid_credits, status FROM invoice WHERE id = $1 AND client_id = $2`,
        [invoiceId, id]
      );

      if (!invoice) {
        return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      }

      if (invoice.amount_paid_credits > 0) {
        return NextResponse.json(
          { error: "Cannot void an invoice with payments" },
          { status: 400 }
        );
      }

      if (invoice.status === "void") {
        return NextResponse.json(
          { error: "Invoice is already voided" },
          { status: 400 }
        );
      }

      // Restore any superseded invoices
      const restoredInvoices = await query<{ invoice_number: string }>(
        `UPDATE invoice 
         SET status = 'generated', superseded_by_invoice_id = NULL, updated_at = NOW()
         WHERE superseded_by_invoice_id = $1
         RETURNING invoice_number`,
        [invoiceId]
      );

      // Void the invoice
      await execute(
        `UPDATE invoice SET status = 'void', updated_at = NOW() WHERE id = $1`,
        [invoiceId]
      );

      return NextResponse.json({
        success: true,
        restoredInvoices: restoredInvoices.map((i) => i.invoice_number),
      });
    }

    return NextResponse.json({ error: "Invalid status update" }, { status: 400 });
  } catch (error) {
    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { error: "Failed to update invoice" },
      { status: 500 }
    );
  }
}
