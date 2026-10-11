import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const record = await db.staffAttendance.findUnique({
      where: { id },
      include: {
        staff: { include: { user: { select: { name: true, email: true } } } },
      },
    });

    if (!record) {
      return NextResponse.json({ error: "Staff attendance record not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    console.error("GET /api/staff-attendance/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.staffAttendance.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Staff attendance record not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (body.status !== undefined) data.status = body.status;

    const updated = await db.staffAttendance.update({
      where: { id },
      data,
      include: {
        staff: { include: { user: { select: { name: true } } } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/staff-attendance/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.staffAttendance.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Staff attendance record not found" }, { status: 404 });
    }

    await db.staffAttendance.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Staff attendance record deleted" });
  } catch (error) {
    console.error("DELETE /api/staff-attendance/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
