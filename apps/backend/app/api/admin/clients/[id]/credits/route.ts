import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne, withTransaction } from "@truestack/shared/db";

// GET /api/admin/clients/:id/credits - Get credit ledger
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
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId") || "true_identity";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Verify client exists
    const client = await queryOne<{ id: string }>(
      "SELECT id FROM client WHERE id = $1",
      [clientId]
    );

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Get current balance
    const balanceResult = await queryOne<{ balance: string }>(
      `SELECT COALESCE(SUM(amount), 0) as balance 
       FROM credit_ledger 
       WHERE client_id = $1 AND product_id = $2`,
      [clientId, productId]
    );

    // Get ledger entries
    const entries = await query<{
      id: string;
      amount: number;
      balance_after: number;
      type: string;
      reference_id: string | null;
      description: string | null;
      created_at: string;
      created_by: string | null;
    }>(
      `SELECT 
        cl.id,
        cl.amount,
        cl.balance_after,
        cl.type,
        cl.reference_id,
        cl.description,
        cl.created_at,
        u.name as created_by_name
       FROM credit_ledger cl
       LEFT JOIN "user" u ON u.id = cl.created_by
       WHERE cl.client_id = $1 AND cl.product_id = $2
       ORDER BY cl.created_at DESC
       LIMIT $3 OFFSET $4`,
      [clientId, productId, limit, offset]
    );

    return NextResponse.json({
      balance: parseInt(balanceResult?.balance || "0"),
      entries,
    });
  } catch (error) {
    console.error("Error fetching credit ledger:", error);
    return NextResponse.json(
      { error: "Failed to fetch credit ledger" },
      { status: 500 }
    );
  }
}

// POST /api/admin/clients/:id/credits - Add credit (top-up, adjustment, refund)
export async function POST(
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
    const { productId = "true_identity", amount, type, description } = body;

    // Validate amount
    if (!amount || typeof amount !== "number") {
      return NextResponse.json(
        { error: "Amount is required and must be a number" },
        { status: 400 }
      );
    }

    // Validate type
    const validTypes = ["topup", "adjustment", "refund", "included"];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Type must be one of: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Verify client exists
    const client = await queryOne<{ id: string; status: string }>(
      "SELECT id, status FROM client WHERE id = $1",
      [clientId]
    );

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Use transaction to ensure consistent balance
    const result = await withTransaction(async (txClient) => {
      // Lock the client row to prevent concurrent credit modifications
      await txClient.query(
        `SELECT id FROM client WHERE id = $1 FOR UPDATE`,
        [clientId]
      );

      // Get current balance (no FOR UPDATE needed since we locked the client row)
      const balanceResult = await txClient.query<{ balance: string }>(
        `SELECT COALESCE(SUM(amount), 0) as balance 
         FROM credit_ledger 
         WHERE client_id = $1 AND product_id = $2`,
        [clientId, productId]
      );

      const currentBalance = parseInt(balanceResult.rows[0]?.balance || "0");
      const newBalance = currentBalance + amount;

      // Insert ledger entry
      const entryResult = await txClient.query<{
        id: string;
        amount: number;
        balance_after: number;
        type: string;
        description: string | null;
        created_at: string;
      }>(
        `INSERT INTO credit_ledger 
          (client_id, product_id, amount, balance_after, type, description, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, amount, balance_after, type, description, created_at`,
        [clientId, productId, amount, newBalance, type, description || null, session.user.id]
      );

      return {
        entry: entryResult.rows[0],
        newBalance,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error adding credits:", error);
    return NextResponse.json(
      { error: "Failed to add credits" },
      { status: 500 }
    );
  }
}
