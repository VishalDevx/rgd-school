import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !["APPROVED", "REJECTED"].includes(body.status)) {
    return NextResponse.json({ error: "status must be APPROVED or REJECTED" }, { status: 400 });
  }

  const updated = await db.leave.update({
    where: { id },
    data: { status: body.status },
  });

  return NextResponse.json({ data: updated });
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await getServerSession(authOption);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const leave = await db.leave.findUnique({
    where: { id },
    include: {
      staff: {
        include: { user: { select: { name: true, email: true } } },
      },
      student: {
        include: { user: { select: { name: true, email: true } } },
      },
    },
  });

  if (!leave) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ data: leave });
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
    const existing = await db.leave.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Leave record not found" }, { status: 404 });
    }

    await db.leave.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Leave record deleted" });
  } catch (error) {
    console.error("DELETE /api/leaves/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
