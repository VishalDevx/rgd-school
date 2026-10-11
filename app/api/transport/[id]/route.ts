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

    const assignment = await db.transportAssignment.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } },
            class: { select: { name: true } },
          },
        },
      },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Transport assignment not found" }, { status: 404 });
    }

    return NextResponse.json(assignment);
  } catch (error) {
    console.error("GET /api/transport/[id] failed:", error);
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
    const existing = await db.transportAssignment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Transport assignment not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (body.routeName !== undefined) data.routeName = body.routeName;
    if (body.stopName !== undefined) data.stopName = body.stopName;
    if (body.busNumber !== undefined) data.busNumber = body.busNumber;
    if (body.driverName !== undefined) data.driverName = body.driverName;
    if (body.driverPhone !== undefined) data.driverPhone = body.driverPhone;
    if (body.feeAmount !== undefined) data.feeAmount = body.feeAmount ? Number(body.feeAmount) : null;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const updated = await db.transportAssignment.update({
      where: { id },
      data,
      include: {
        student: {
          include: {
            user: { select: { name: true } },
            class: { select: { name: true } },
          },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/transport/[id] failed:", error);
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
    const existing = await db.transportAssignment.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Transport assignment not found" }, { status: 404 });
    }

    // Also update the student's usesTransport flag
    await db.student.update({
      where: { id: existing.studentId },
      data: { usesTransport: false },
    });

    await db.transportAssignment.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Transport assignment deleted" });
  } catch (error) {
    console.error("DELETE /api/transport/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
