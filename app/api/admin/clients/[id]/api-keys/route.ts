import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { generateApiKey, decryptKey, formatKeyForDisplay } from "@/lib/api-keys";

// GET /api/admin/clients/:id/api-keys - List API keys for a client
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
    const client = await queryOne<{ id: string }>(
      "SELECT id FROM client WHERE id = $1",
      [clientId]
    );

    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    // Get all API keys for this client
    const keys = await query<{
      id: string;
      product_id: string;
      api_key_prefix: string;
      api_key_suffix: string;
      environment: string;
      status: string;
      created_at: string;
      revoked_at: string | null;
    }>(
      `SELECT 
        cak.id,
        cak.product_id,
        cak.api_key_prefix,
        cak.api_key_suffix,
        cak.environment,
        cak.status,
        cak.created_at,
        cak.revoked_at,
        p.name as product_name,
        p.key_prefix as product_key_prefix
       FROM client_api_key cak
       JOIN product p ON p.id = cak.product_id
       WHERE cak.client_id = $1
       ORDER BY cak.product_id, cak.environment, cak.created_at DESC`,
      [clientId]
    );

    return NextResponse.json(
      keys.map((key) => ({
        ...key,
        displayKey: formatKeyForDisplay(key.api_key_prefix, key.api_key_suffix),
      }))
    );
  } catch (error) {
    console.error("Error fetching API keys:", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

// POST /api/admin/clients/:id/api-keys - Generate a new API key
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
    const { productId, environment = "live" } = body;

    // Validate environment
    if (!["live", "test"].includes(environment)) {
      return NextResponse.json(
        { error: "Environment must be 'live' or 'test'" },
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

    if (client.status !== "active") {
      return NextResponse.json(
        { error: "Cannot generate API key for inactive client" },
        { status: 400 }
      );
    }

    // Get product details
    const product = await queryOne<{ id: string; key_prefix: string }>(
      "SELECT id, key_prefix FROM product WHERE id = $1 AND status = 'active'",
      [productId || "true_identity"]
    );

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Check if there's already an active key for this product/environment
    const existingKey = await queryOne<{ id: string }>(
      `SELECT id FROM client_api_key 
       WHERE client_id = $1 AND product_id = $2 AND environment = $3 AND status = 'active'`,
      [clientId, product.id, environment]
    );

    if (existingKey) {
      return NextResponse.json(
        { error: "An active key already exists for this product and environment. Revoke or rotate the existing key first." },
        { status: 409 }
      );
    }

    // Generate new API key
    const generated = generateApiKey(product.key_prefix, environment as "live" | "test");

    // Store the key
    const newKey = await queryOne<{
      id: string;
      api_key_prefix: string;
      api_key_suffix: string;
      environment: string;
      created_at: string;
    }>(
      `INSERT INTO client_api_key 
        (client_id, product_id, api_key_hash, api_key_encrypted, api_key_prefix, api_key_suffix, environment, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, api_key_prefix, api_key_suffix, environment, created_at`,
      [
        clientId,
        product.id,
        generated.hash,
        generated.encrypted,
        generated.prefix,
        generated.suffix,
        environment,
        session.user.id,
      ]
    );

    // Return the full key ONCE (this is the only time it's shown)
    return NextResponse.json({
      ...newKey,
      key: generated.key, // Full key shown only on creation
      productId: product.id,
      displayKey: formatKeyForDisplay(generated.prefix, generated.suffix),
    }, { status: 201 });
  } catch (error) {
    console.error("Error generating API key:", error);
    return NextResponse.json(
      { error: "Failed to generate API key" },
      { status: 500 }
    );
  }
}
