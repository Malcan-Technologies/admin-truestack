import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { execute } from "@truestack/shared/db";

// POST /api/admin/update-profile - Update the current user's profile
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    // Validate name
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: "Name must be less than 100 characters" },
        { status: 400 }
      );
    }

    // Update the user's name
    const updated = await execute(
      `UPDATE "user" SET name = $1, updated_at = NOW() WHERE id = $2`,
      [name.trim(), session.user.id]
    );

    if (updated === 0) {
      return NextResponse.json(
        { error: "Failed to update profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
