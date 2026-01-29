import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@truestack/shared/db";
import { recordPayment, getReceiptPdfUrl } from "@truestack/shared/invoice";

// GET /api/admin/clients/:id/invoices/:invoiceId/payments - List payments for invoice
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

    // Verify invoice belongs to client
    const invoice = await queryOne<{ id: string }>(`
      SELECT id FROM invoice WHERE id = $1 AND client_id = $2
    `, [invoiceId, clientId]);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Get payments
    const payments = await query<{
      id: string;
      receipt_number: string;
      amount_credits: number;
      amount_myr: string;
      payment_date: string;
      payment_method: string | null;
      payment_reference: string | null;
      s3_key: string;
      recorded_by_name: string | null;
      notes: string | null;
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
        p.s3_key,
        u.name as recorded_by_name,
        p.notes,
        p.created_at
      FROM payment p
      LEFT JOIN "user" u ON u.id = p.recorded_by
      WHERE p.invoice_id = $1
      ORDER BY p.payment_date DESC, p.created_at DESC
    `, [invoiceId]);

    // Get presigned URLs for receipts
    const paymentsWithUrls = await Promise.all(
      payments.map(async (payment) => {
        let receiptUrl: string | null = null;
        try {
          receiptUrl = await getReceiptPdfUrl(payment.id);
        } catch {
          // Receipt may not exist
        }
        return { ...payment, receiptUrl };
      })
    );

    return NextResponse.json({ payments: paymentsWithUrls });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    );
  }
}

// POST /api/admin/clients/:id/invoices/:invoiceId/payments - Record new payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; invoiceId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId, invoiceId } = await params;

    // Verify invoice belongs to client
    const invoice = await queryOne<{ id: string; status: string }>(`
      SELECT id, status FROM invoice WHERE id = $1 AND client_id = $2
    `, [invoiceId, clientId]);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Parse body
    const body = await request.json();
    const { amountCredits, paymentDate, paymentMethod, paymentReference, notes } = body;

    // Validate required fields
    if (!amountCredits || typeof amountCredits !== "number" || amountCredits <= 0) {
      return NextResponse.json(
        { error: "amountCredits is required and must be a positive number" },
        { status: 400 }
      );
    }

    if (!paymentDate) {
      return NextResponse.json(
        { error: "paymentDate is required" },
        { status: 400 }
      );
    }

    // Record the payment
    const result = await recordPayment(invoiceId, {
      amountCredits,
      paymentDate: new Date(paymentDate),
      paymentMethod,
      paymentReference,
      notes,
      recordedBy: session.user.id,
    });

    // Get receipt URL
    let receiptUrl: string | null = null;
    try {
      receiptUrl = await getReceiptPdfUrl(result.id);
    } catch {
      // Receipt may not be ready yet
    }

    return NextResponse.json({
      payment: {
        ...result,
        receiptUrl,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Error recording payment:", error);
    const message = error instanceof Error ? error.message : "Failed to record payment";
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
