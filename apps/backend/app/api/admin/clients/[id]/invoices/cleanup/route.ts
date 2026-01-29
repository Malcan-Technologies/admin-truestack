import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, execute } from "@truestack/shared/db";

// GET /api/admin/clients/:id/invoices/cleanup - Check for stuck invoices
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

    // Find stuck invoices (pending or generated but without PDF)
    const stuckInvoices = await query<{
      id: string;
      invoice_number: string;
      status: string;
      s3_key: string;
    }>(
      `SELECT id, invoice_number, status, s3_key
       FROM invoice
       WHERE client_id = $1
         AND (
           status = 'pending'
           OR (status = 'generated' AND (s3_key IS NULL OR s3_key = ''))
         )
       ORDER BY generated_at DESC`,
      [id]
    );

    return NextResponse.json({
      count: stuckInvoices.length,
      invoices: stuckInvoices,
    });
  } catch (error) {
    console.error("Error checking stuck invoices:", error);
    return NextResponse.json(
      { error: "Failed to check stuck invoices" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/clients/:id/invoices/cleanup - Delete stuck invoices
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Get stuck invoices before deleting for response
    const stuckInvoices = await query<{
      invoice_number: string;
      status: string;
    }>(
      `SELECT invoice_number, status
       FROM invoice
       WHERE client_id = $1
         AND (
           status = 'pending'
           OR (status = 'generated' AND (s3_key IS NULL OR s3_key = ''))
         )`,
      [id]
    );

    // Delete stuck invoices (also deletes line items via cascade)
    const deleted = await execute(
      `DELETE FROM invoice
       WHERE client_id = $1
         AND (
           status = 'pending'
           OR (status = 'generated' AND (s3_key IS NULL OR s3_key = ''))
         )`,
      [id]
    );

    return NextResponse.json({
      deleted,
      invoices: stuckInvoices.map((i) => ({
        number: i.invoice_number,
        status: i.status,
      })),
    });
  } catch (error) {
    console.error("Error cleaning up invoices:", error);
    return NextResponse.json(
      { error: "Failed to clean up invoices" },
      { status: 500 }
    );
  }
}
