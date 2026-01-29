import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { recordAdvancePayment, getAdvancePayments } from "@truestack/shared/invoice";

// GET /api/admin/clients/:id/advance-payments - List advance payments
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
    const payments = await getAdvancePayments(clientId);

    return NextResponse.json({ payments });
  } catch (error) {
    console.error("Error fetching advance payments:", error);
    return NextResponse.json(
      { error: "Failed to fetch advance payments" },
      { status: 500 }
    );
  }
}

// POST /api/admin/clients/:id/advance-payments - Record advance payment
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
    const { amountCredits, paymentDate, paymentMethod, paymentReference, notes } = body;

    if (!amountCredits || amountCredits <= 0) {
      return NextResponse.json(
        { error: "Amount must be greater than 0" },
        { status: 400 }
      );
    }

    if (!paymentDate) {
      return NextResponse.json(
        { error: "Payment date is required" },
        { status: 400 }
      );
    }

    const result = await recordAdvancePayment(clientId, {
      amountCredits,
      paymentDate: new Date(paymentDate),
      paymentMethod,
      paymentReference,
      notes,
      recordedBy: session.user.id,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Error recording advance payment:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record advance payment" },
      { status: 500 }
    );
  }
}
