import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne, execute } from "@truestack/shared/db";

// GET /api/admin/clients/:id - Get client details
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

    const client = await queryOne<{
      id: string;
      name: string;
      code: string;
      contact_email: string | null;
      contact_phone: string | null;
      company_registration: string | null;
      status: string;
      notes: string | null;
      created_at: string;
      updated_at: string;
      client_source: string | null;
    }>(
      `SELECT 
        c.id,
        c.name,
        c.code,
        c.contact_email,
        c.contact_phone,
        c.company_registration,
        c.status,
        c.notes,
        c.created_at,
        c.updated_at,
        COALESCE(c.client_source, 'api') as client_source
      FROM client c
      WHERE c.id = $1`,
      [id]
    );

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Get credit balance
    const balanceResult = await queryOne<{ balance: string }>(
      `SELECT COALESCE(SUM(amount), 0) as balance 
       FROM credit_ledger 
       WHERE client_id = $1 AND product_id = 'true_identity'`,
      [id]
    );

    // Get session count
    const sessionResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*) as count FROM kyc_session WHERE client_id = $1`,
      [id]
    );

    // Get product config
    const productConfig = await queryOne<{
      enabled: boolean;
      webhook_url: string | null;
      success_url: string | null;
      fail_url: string | null;
      allow_overdraft: boolean;
    }>(
      `SELECT enabled, webhook_url, success_url, fail_url, allow_overdraft
       FROM client_product_config
       WHERE client_id = $1 AND product_id = 'true_identity'`,
      [id]
    );

    return NextResponse.json({
      ...client,
      creditBalance: parseInt(balanceResult?.balance || "0"),
      sessionsCount: parseInt(sessionResult?.count || "0"),
      trueIdentityConfig: productConfig || {
        enabled: false,
        webhook_url: null,
        success_url: null,
        fail_url: null,
        allow_overdraft: false,
      },
    });
  } catch (error) {
    console.error("Error fetching client:", error);
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/clients/:id - Update client
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, contactEmail, contactPhone, companyRegistration, notes, status } = body;

    const client = await queryOne<{ id: string }>(
      `UPDATE client 
       SET name = COALESCE($1, name),
           contact_email = COALESCE($2, contact_email),
           contact_phone = COALESCE($3, contact_phone),
           company_registration = COALESCE($4, company_registration),
           notes = COALESCE($5, notes),
           status = COALESCE($6, status)
       WHERE id = $7
       RETURNING id`,
      [name, contactEmail, contactPhone, companyRegistration, notes, status, id]
    );

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating client:", error);
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/clients/:id - Delete client (soft delete via status)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check role - only super_admin can delete
    const user = session.user as { role?: string };
    if (user.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    const result = await execute(
      `UPDATE client SET status = 'deleted' WHERE id = $1`,
      [id]
    );

    if (result === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting client:", error);
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    );
  }
}
