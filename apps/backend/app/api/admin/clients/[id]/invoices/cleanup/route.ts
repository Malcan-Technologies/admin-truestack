import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@truestack/shared/db";

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

    const { id: clientId } = await params;

    // Find stuck invoices - pending status or empty s3_key
    const stuckInvoices = await query<{ 
      id: string; 
      invoice_number: string; 
      status: string; 
      s3_key: string;
      generated_at: string;
    }>(`
      SELECT id, invoice_number, status, s3_key, generated_at
      FROM invoice 
      WHERE client_id = $1 
        AND (status = 'pending' OR s3_key = '' OR s3_key IS NULL)
      ORDER BY generated_at DESC
    `, [clientId]);

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

// DELETE /api/admin/clients/:id/invoices/cleanup - Clean up stuck/pending invoices
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId } = await params;

    // Delete stuck invoices - pending status OR empty s3_key (failed upload)
    const result = await query<{ id: string; invoice_number: string; status: string }>(`
      DELETE FROM invoice 
      WHERE client_id = $1 
        AND (status = 'pending' OR s3_key = '' OR s3_key IS NULL)
      RETURNING id, invoice_number, status
    `, [clientId]);

    const deleted = result.length;

    if (deleted > 0) {
      console.log(`[Cleanup] Deleted ${deleted} stuck invoice(s) for client ${clientId}:`, 
        result.map(r => `${r.invoice_number} (${r.status})`));
    }

    return NextResponse.json({ 
      success: true, 
      deleted,
      invoices: result.map(r => ({ number: r.invoice_number, status: r.status })),
    });
  } catch (error) {
    console.error("Error cleaning up invoices:", error);
    return NextResponse.json(
      { error: "Failed to clean up invoices" },
      { status: 500 }
    );
  }
}
