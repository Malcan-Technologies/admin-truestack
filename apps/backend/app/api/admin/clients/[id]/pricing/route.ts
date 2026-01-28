import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne, withTransaction } from "@truestack/shared/db";

// GET /api/admin/clients/[id]/pricing - Get pricing tiers for a client
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

    // Verify client exists
    const client = await queryOne<{ id: string; name: string }>(
      "SELECT id, name FROM client WHERE id = $1",
      [clientId]
    );

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Get pricing tiers
    // Credit system: 10 credits = RM 1
    const tiers = await query<{
      id: string;
      tier_name: string;
      min_volume: number;
      max_volume: number | null;
      credits_per_session: number;
      created_at: string;
      updated_at: string;
    }>(
      `SELECT id, tier_name, min_volume, max_volume, credits_per_session, created_at, updated_at
       FROM pricing_tier
       WHERE client_id = $1 AND product_id = 'true_identity'
       ORDER BY min_volume ASC`,
      [clientId]
    );

    // Get current month's usage for context
    const usageResult = await queryOne<{ usage: string }>(
      `SELECT COUNT(*) as usage
       FROM kyc_session
       WHERE client_id = $1 
         AND status = 'completed'
         AND created_at >= date_trunc('month', NOW())`,
      [clientId]
    );

    const currentMonthUsage = parseInt(usageResult?.usage || "0");

    // Get client product config for allow_overdraft setting
    const configResult = await queryOne<{ allow_overdraft: boolean }>(
      `SELECT allow_overdraft
       FROM client_product_config
       WHERE client_id = $1 AND product_id = 'true_identity'`,
      [clientId]
    );

    return NextResponse.json({
      clientId,
      clientName: client.name,
      tiers,
      currentMonthUsage,
      allowOverdraft: configResult?.allow_overdraft ?? false,
    });
  } catch (error) {
    console.error("Error fetching pricing tiers:", error);
    return NextResponse.json(
      { error: "Failed to fetch pricing tiers" },
      { status: 500 }
    );
  }
}

// POST /api/admin/clients/[id]/pricing - Create or update pricing tiers
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
    const { tiers } = body;

    // Validate tiers array
    if (!Array.isArray(tiers) || tiers.length === 0) {
      return NextResponse.json(
        { error: "At least one pricing tier is required" },
        { status: 400 }
      );
    }

    // Validate tier structure
    // Credit system: 10 credits = RM 1
    // Session numbers are 1-indexed (first session = 1)
    for (const tier of tiers) {
      if (typeof tier.minVolume !== "number" || tier.minVolume < 1) {
        return NextResponse.json(
          { error: "Invalid minVolume in tier - must be at least 1 (session numbers are 1-indexed)" },
          { status: 400 }
        );
      }
      if (tier.maxVolume !== null && tier.maxVolume !== undefined && typeof tier.maxVolume !== "number") {
        return NextResponse.json(
          { error: "Invalid maxVolume in tier" },
          { status: 400 }
        );
      }
      if (typeof tier.creditsPerSession !== "number" || tier.creditsPerSession < 1 || !Number.isInteger(tier.creditsPerSession)) {
        return NextResponse.json(
          { error: "Invalid creditsPerSession in tier - must be a positive integer" },
          { status: 400 }
        );
      }
    }

    // Verify client exists
    const client = await queryOne<{ id: string }>(
      "SELECT id FROM client WHERE id = $1",
      [clientId]
    );

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Replace all existing tiers with new ones in a transaction
    const result = await withTransaction(async (txClient) => {
      // Delete existing tiers
      await txClient.query(
        "DELETE FROM pricing_tier WHERE client_id = $1 AND product_id = 'true_identity'",
        [clientId]
      );

      // Insert new tiers
      const insertedTiers = [];
      for (let i = 0; i < tiers.length; i++) {
        const tier = tiers[i];
        const tierName = tier.tierName || `Tier ${i + 1}`;

        const result = await txClient.query<{
          id: string;
          tier_name: string;
          min_volume: number;
          max_volume: number | null;
          credits_per_session: number;
        }>(
          `INSERT INTO pricing_tier 
            (client_id, product_id, tier_name, min_volume, max_volume, credits_per_session)
           VALUES ($1, 'true_identity', $2, $3, $4, $5)
           RETURNING id, tier_name, min_volume, max_volume, credits_per_session`,
          [
            clientId,
            tierName,
            tier.minVolume,
            tier.maxVolume || null,
            tier.creditsPerSession,
          ]
        );

        insertedTiers.push(result.rows[0]);
      }

      return insertedTiers;
    });

    return NextResponse.json({ tiers: result }, { status: 201 });
  } catch (error) {
    console.error("Error updating pricing tiers:", error);
    return NextResponse.json(
      { error: "Failed to update pricing tiers" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/clients/[id]/pricing - Delete all pricing tiers
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

    await query(
      "DELETE FROM pricing_tier WHERE client_id = $1 AND product_id = 'true_identity'",
      [clientId]
    );

    return NextResponse.json({ success: true, message: "Pricing tiers deleted" });
  } catch (error) {
    console.error("Error deleting pricing tiers:", error);
    return NextResponse.json(
      { error: "Failed to delete pricing tiers" },
      { status: 500 }
    );
  }
}
