import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne, execute } from "@/lib/db";
import { generateApiKey, decryptKey, formatKeyForDisplay } from "@/lib/api-keys";

// GET /api/admin/clients/:id/api-keys/:keyId - Get key details (with reveal option)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; keyId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId, keyId } = await params;
    const { searchParams } = new URL(request.url);
    const reveal = searchParams.get("reveal") === "true";

    const key = await queryOne<{
      id: string;
      client_id: string;
      product_id: string;
      api_key_encrypted: string;
      api_key_prefix: string;
      api_key_suffix: string;
      environment: string;
      status: string;
      created_at: string;
      revoked_at: string | null;
    }>(
      `SELECT * FROM client_api_key WHERE id = $1 AND client_id = $2`,
      [keyId, clientId]
    );

    if (!key) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    const response: Record<string, unknown> = {
      id: key.id,
      productId: key.product_id,
      apiKeyPrefix: key.api_key_prefix,
      apiKeySuffix: key.api_key_suffix,
      environment: key.environment,
      status: key.status,
      createdAt: key.created_at,
      revokedAt: key.revoked_at,
      displayKey: formatKeyForDisplay(key.api_key_prefix, key.api_key_suffix),
    };

    // Reveal full key if requested
    if (reveal) {
      try {
        response.fullKey = decryptKey(key.api_key_encrypted);
      } catch (error) {
        console.error("Error decrypting key:", error);
        return NextResponse.json(
          { error: "Failed to decrypt key" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error fetching API key:", error);
    return NextResponse.json(
      { error: "Failed to fetch API key" },
      { status: 500 }
    );
  }
}

// POST /api/admin/clients/:id/api-keys/:keyId/rotate - Rotate API key
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; keyId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId, keyId } = await params;
    const body = await request.json();
    const { confirmRotate } = body;

    // Require confirmation
    if (confirmRotate !== "ROTATE") {
      return NextResponse.json(
        { error: "Please type ROTATE to confirm" },
        { status: 400 }
      );
    }

    // Get existing key
    const existingKey = await queryOne<{
      id: string;
      client_id: string;
      product_id: string;
      environment: string;
      status: string;
    }>(
      `SELECT id, client_id, product_id, environment, status 
       FROM client_api_key 
       WHERE id = $1 AND client_id = $2`,
      [keyId, clientId]
    );

    if (!existingKey) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    if (existingKey.status !== "active") {
      return NextResponse.json(
        { error: "Cannot rotate a revoked key" },
        { status: 400 }
      );
    }

    // Get product key prefix
    const product = await queryOne<{ key_prefix: string }>(
      "SELECT key_prefix FROM product WHERE id = $1",
      [existingKey.product_id]
    );

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Generate new key
    const generated = generateApiKey(
      product.key_prefix,
      existingKey.environment as "live" | "test"
    );

    // Revoke old key
    await execute(
      `UPDATE client_api_key 
       SET status = 'revoked', revoked_at = NOW(), revoked_by = $1 
       WHERE id = $2`,
      [session.user.id, keyId]
    );

    // Create new key
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
        existingKey.product_id,
        generated.hash,
        generated.encrypted,
        generated.prefix,
        generated.suffix,
        existingKey.environment,
        session.user.id,
      ]
    );

    return NextResponse.json({
      ...newKey,
      key: generated.key, // Full key shown only on rotation
      productId: existingKey.product_id,
      displayKey: formatKeyForDisplay(generated.prefix, generated.suffix),
      previousKeyId: keyId,
    });
  } catch (error) {
    console.error("Error rotating API key:", error);
    return NextResponse.json(
      { error: "Failed to rotate API key" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/clients/:id/api-keys/:keyId - Revoke API key
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; keyId: string }> }
) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: clientId, keyId } = await params;

    // Verify key exists and belongs to client
    const key = await queryOne<{ id: string; status: string }>(
      `SELECT id, status FROM client_api_key WHERE id = $1 AND client_id = $2`,
      [keyId, clientId]
    );

    if (!key) {
      return NextResponse.json({ error: "API key not found" }, { status: 404 });
    }

    if (key.status === "revoked") {
      return NextResponse.json(
        { error: "Key is already revoked" },
        { status: 400 }
      );
    }

    // Revoke the key
    await execute(
      `UPDATE client_api_key 
       SET status = 'revoked', revoked_at = NOW(), revoked_by = $1 
       WHERE id = $2`,
      [session.user.id, keyId]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error revoking API key:", error);
    return NextResponse.json(
      { error: "Failed to revoke API key" },
      { status: 500 }
    );
  }
}
