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

    const result = await db.result.findUnique({
      where: { id },
      include: {
        student: { include: { user: { select: { name: true } } } },
        exam: { select: { name: true } },
        subject: { select: { name: true, code: true } },
      },
    });

    if (!result) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error("GET /api/results/[id] failed:", error);
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
    const existing = await db.result.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (body.marks !== undefined) data.marks = Number(body.marks);
    if (body.maxMarks !== undefined) data.maxMarks = Number(body.maxMarks);
    if (body.grade !== undefined) data.grade = body.grade;
    if (body.rank !== undefined) data.rank = body.rank ? Number(body.rank) : null;
    if (body.remarks !== undefined) data.remarks = body.remarks;

    const updated = await db.result.update({
      where: { id },
      data,
      include: {
        student: { include: { user: { select: { name: true } } } },
        exam: { select: { name: true } },
        subject: { select: { name: true, code: true } },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/results/[id] failed:", error);
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
    const existing = await db.result.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Result not found" }, { status: 404 });
    }

    await db.result.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Result deleted" });
  } catch (error) {
    console.error("DELETE /api/results/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
