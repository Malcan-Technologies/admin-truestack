import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query } from "@truestack/shared/db";

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

    // Delete pending invoices (failed during generation)
    const result = await query<{ id: string; invoice_number: string }>(`
      DELETE FROM invoice 
      WHERE client_id = $1 
        AND status = 'pending'
      RETURNING id, invoice_number
    `, [clientId]);

    const deleted = result.length;

    if (deleted > 0) {
      console.log(`[Cleanup] Deleted ${deleted} pending invoice(s) for client ${clientId}:`, 
        result.map(r => r.invoice_number));
    }

    return NextResponse.json({ 
      success: true, 
      deleted,
      invoices: result.map(r => r.invoice_number),
    });
  } catch (error) {
    console.error("Error cleaning up invoices:", error);
    return NextResponse.json(
      { error: "Failed to clean up invoices" },
      { status: 500 }
    );
  }
}
