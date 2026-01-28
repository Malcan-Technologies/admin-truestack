import { NextRequest, NextResponse } from "next/server";
import { query, queryOne } from "@truestack/shared/db";

// POST /api/demo/webhook - Receive webhook from our backend (simulates client's webhook endpoint)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Extract event and session info from webhook payload
    const { event, session_id, ref_id, status, result, reject_message, document_name, document_number, metadata, timestamp } = body;

    // Validate required fields
    if (!session_id) {
      console.error("Demo webhook received without session_id:", body);
      return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
    }

    // Store the webhook payload in demo_webhook table
    await query(
      `INSERT INTO demo_webhook (session_id, event, payload)
       VALUES ($1, $2, $3)`,
      [session_id, event || "unknown", JSON.stringify(body)]
    );

    console.log(`Demo webhook received for session ${session_id}:`, {
      event,
      status,
      result,
      document_name,
    });

    return NextResponse.json({ success: true, message: "Webhook received" });
  } catch (error) {
    console.error("Error processing demo webhook:", error);
    return NextResponse.json(
      { error: "Failed to process webhook" },
      { status: 500 }
    );
  }
}

// GET /api/demo/webhook - Get all demo webhooks (most recent first)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("session_id");
    const limit = parseInt(searchParams.get("limit") || "20");

    let webhooks;

    if (sessionId) {
      // Get webhooks for a specific session
      webhooks = await query<{
        id: string;
        session_id: string;
        event: string;
        payload: Record<string, unknown>;
        received_at: string;
      }>(
        `SELECT id, session_id, event, payload, received_at
         FROM demo_webhook
         WHERE session_id = $1
         ORDER BY received_at DESC
         LIMIT $2`,
        [sessionId, limit]
      );
    } else {
      // Get all recent webhooks
      webhooks = await query<{
        id: string;
        session_id: string;
        event: string;
        payload: Record<string, unknown>;
        received_at: string;
      }>(
        `SELECT id, session_id, event, payload, received_at
         FROM demo_webhook
         ORDER BY received_at DESC
         LIMIT $1`,
        [limit]
      );
    }

    return NextResponse.json(webhooks);
  } catch (error) {
    console.error("Error fetching demo webhooks:", error);
    return NextResponse.json(
      { error: "Failed to fetch webhooks" },
      { status: 500 }
    );
  }
}

// DELETE /api/demo/webhook - Clear all demo webhooks
export async function DELETE(request: NextRequest) {
  try {
    await query("DELETE FROM demo_webhook");
    return NextResponse.json({ success: true, message: "All demo webhooks cleared" });
  } catch (error) {
    console.error("Error clearing demo webhooks:", error);
    return NextResponse.json(
      { error: "Failed to clear webhooks" },
      { status: 500 }
    );
  }
}
