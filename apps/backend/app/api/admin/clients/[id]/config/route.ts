import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@truestack/shared/db";

// PATCH /api/admin/clients/[id]/config - Update client product config
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId } = await params;
    const body = await request.json();

    // Verify client exists
    const client = await queryOne<{ id: string }>(
      "SELECT id FROM client WHERE id = $1",
      [clientId]
    );

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Build update fields
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (body.allow_overdraft !== undefined) {
      updates.push(`allow_overdraft = $${paramIndex++}`);
      values.push(body.allow_overdraft);
    }

    if (body.webhook_url !== undefined) {
      updates.push(`webhook_url = $${paramIndex++}`);
      values.push(body.webhook_url);
    }

    if (body.success_url !== undefined) {
      updates.push(`success_url = $${paramIndex++}`);
      values.push(body.success_url);
    }

    if (body.fail_url !== undefined) {
      updates.push(`fail_url = $${paramIndex++}`);
      values.push(body.fail_url);
    }

    if (body.enabled !== undefined) {
      updates.push(`enabled = $${paramIndex++}`);
      values.push(body.enabled);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Add client_id for WHERE clause
    values.push(clientId);

    // Update config (upsert)
    await query(
      `INSERT INTO client_product_config (client_id, product_id, ${updates.map((u) => u.split(" = ")[0]).join(", ")})
       VALUES ($${paramIndex}, 'true_identity', ${values.slice(0, -1).map((_, i) => `$${i + 1}`).join(", ")})
       ON CONFLICT (client_id, product_id) 
       DO UPDATE SET ${updates.join(", ")}`,
      values
    );

    // Fetch updated config
    const config = await queryOne<{
      enabled: boolean;
      webhook_url: string | null;
      success_url: string | null;
      fail_url: string | null;
      allow_overdraft: boolean;
    }>(
      `SELECT enabled, webhook_url, success_url, fail_url, allow_overdraft
       FROM client_product_config
       WHERE client_id = $1 AND product_id = 'true_identity'`,
      [clientId]
    );

    return NextResponse.json({
      success: true,
      config,
    });
  } catch (error) {
    console.error("Error updating client config:", error);
    return NextResponse.json(
      { error: "Failed to update client config" },
      { status: 500 }
    );
  }
}

// GET /api/admin/clients/[id]/config - Get client product config
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

    const config = await queryOne<{
      enabled: boolean;
      webhook_url: string | null;
      success_url: string | null;
      fail_url: string | null;
      allow_overdraft: boolean;
    }>(
      `SELECT enabled, webhook_url, success_url, fail_url, allow_overdraft
       FROM client_product_config
       WHERE client_id = $1 AND product_id = 'true_identity'`,
      [clientId]
    );

    return NextResponse.json({
      config: config || {
        enabled: false,
        webhook_url: null,
        success_url: null,
        fail_url: null,
        allow_overdraft: false,
      },
    });
  } catch (error) {
    console.error("Error fetching client config:", error);
    return NextResponse.json(
      { error: "Failed to fetch client config" },
      { status: 500 }
    );
  }
}
