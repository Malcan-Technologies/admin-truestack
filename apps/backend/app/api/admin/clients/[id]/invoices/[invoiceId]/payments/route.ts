import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@truestack/shared/db";
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

    const { id, invoiceId } = await params;

    const payments = await query<{
      id: string;
      receipt_number: string;
      amount_credits: number;
      amount_myr: string;
      sst_rate: string;
      sst_amount_myr: string;
      total_with_sst_myr: string;
      payment_date: string;
      payment_method: string | null;
      payment_reference: string | null;
      recorded_by_name: string | null;
      s3_key: string;
    }>(
      `SELECT 
        p.id,
        p.receipt_number,
        p.amount_credits,
        p.amount_myr,
        COALESCE(p.sst_rate, 0.08) as sst_rate,
        COALESCE(p.sst_amount_myr, ROUND(p.amount_myr * 0.08, 2)) as sst_amount_myr,
        COALESCE(p.total_with_sst_myr, ROUND(p.amount_myr * 1.08, 2)) as total_with_sst_myr,
        p.payment_date,
        p.payment_method,
        p.payment_reference,
        u.name as recorded_by_name,
        p.s3_key
      FROM payment p
      LEFT JOIN "user" u ON u.id = p.recorded_by
      WHERE p.invoice_id = $1 AND p.client_id = $2
      ORDER BY p.created_at DESC`,
      [invoiceId, id]
    );

    // Get receipt URLs
    const paymentsWithUrls = await Promise.all(
      payments.map(async (p) => {
        let receiptUrl: string | null = null;
        if (p.s3_key) {
          try {
            receiptUrl = await getReceiptPdfUrl(p.id);
          } catch (error) {
            console.error("Error getting receipt URL:", error);
          }
        }
        return { ...p, receiptUrl };
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

// POST /api/admin/clients/:id/invoices/:invoiceId/payments - Record a payment
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; invoiceId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { invoiceId } = await params;
    const body = await request.json();
    const { amountCredits, paymentDate, paymentMethod, paymentReference, notes } = body;

    if (!amountCredits || amountCredits < 0) {
      return NextResponse.json(
        { error: "Invalid payment amount" },
        { status: 400 }
      );
    }

    if (!paymentDate) {
      return NextResponse.json(
        { error: "Payment date is required" },
        { status: 400 }
      );
    }

    const payment = await recordPayment(invoiceId, {
      amountCredits,
      paymentDate: new Date(paymentDate),
      paymentMethod,
      paymentReference,
      notes,
      recordedBy: session.user.id,
    });

    return NextResponse.json({ payment });
  } catch (error) {
    console.error("Error recording payment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record payment" },
      { status: 500 }
    );
  }
}
