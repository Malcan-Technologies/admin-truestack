import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { queryOne } from "@truestack/shared/db";
import { getReceiptPdfUrl } from "@truestack/shared/invoice";

// GET /api/admin/clients/:id/payments/:paymentId - Get payment/receipt details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId, paymentId } = await params;

    // Get payment with client validation
    const payment = await queryOne<{
      id: string;
      invoice_id: string;
      invoice_number: string;
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
        p.invoice_id,
        i.invoice_number,
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
      JOIN invoice i ON i.id = p.invoice_id
      LEFT JOIN "user" u ON u.id = p.recorded_by
      WHERE p.id = $1 AND p.client_id = $2
    `, [paymentId, clientId]);

    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    // Get presigned URL for receipt
    let receiptUrl: string | null = null;
    try {
      receiptUrl = await getReceiptPdfUrl(paymentId);
    } catch {
      // Receipt may not exist
    }

    return NextResponse.json({
      payment,
      receiptUrl,
    });
  } catch (error) {
    console.error("Error fetching payment:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment" },
      { status: 500 }
    );
  }
}
