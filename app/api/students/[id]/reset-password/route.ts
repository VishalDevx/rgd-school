import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: studentId } = await params;

    // Admin only
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get student record
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Get default password from request body or use default
    const body = await request.json().catch(() => ({}));
    const defaultPassword = body?.password || "Student@123";

    // Hash the password
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    // Update user password
    await db.user.update({
      where: { id: student.userId },
      data: { passwordHash: hashedPassword },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "RESET_PASSWORD",
        entity: "Student",
        entityId: studentId,
        newValue: { userId: student.userId, email: student.user.email },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Password reset successfully",
      defaultPassword, // Return the password so admin can share it
    });
  } catch (err) {
    console.error("Error resetting student password:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
