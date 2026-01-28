import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { execute } from "@truestack/shared/db";

// POST /api/admin/migrate-role - Migrate super_admin role to admin
// This is a one-time migration endpoint for users with super_admin role
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentRole = (session.user as { role?: string }).role;

    // Only allow super_admin to migrate to admin
    if (currentRole !== "super_admin") {
      return NextResponse.json(
        { error: "Only super_admin users can use this endpoint" },
        { status: 403 }
      );
    }

    // Update the user's role from super_admin to admin
    const updated = await execute(
      `UPDATE "user" SET role = 'admin' WHERE id = $1 AND role = 'super_admin'`,
      [session.user.id]
    );

    if (updated === 0) {
      return NextResponse.json(
        { error: "Failed to update role" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Role migrated from super_admin to admin. Please log out and log back in for the change to take effect.",
    });
  } catch (error) {
    console.error("Error migrating role:", error);
    return NextResponse.json(
      { error: "Failed to migrate role" },
      { status: 500 }
    );
  }
}
