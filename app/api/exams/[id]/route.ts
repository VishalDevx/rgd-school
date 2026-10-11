import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const exam = await db.exam.findUnique({
      where: { id },
      include: {
        class: true,
        dateSheet: {
          include: { subject: true },
          orderBy: { examDate: "asc" },
        },
      },
    });
    if (!exam) {
      return new NextResponse("Exam not found", { status: 404 });
    }
    return NextResponse.json(exam);
  } catch (error) {
    console.error("GET /api/exams/[id] failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) return new NextResponse("Invalid payload", { status: 400 });

    const existing = await db.exam.findUnique({ where: { id } });
    if (!existing) return new NextResponse("Exam not found", { status: 404 });

    const data: Record<string, unknown> = {};
    if (body.name) data.name = body.name;
    if (body.classId) data.classId = body.classId;
    if (body.category) data.category = body.category;
    if (body.sequence !== undefined) data.sequence = body.sequence;
    if (body.startDate) data.startDate = new Date(body.startDate);
    if (body.endDate) data.endDate = new Date(body.endDate);
    if (typeof body.isLocked === "boolean") data.isLocked = body.isLocked;
    if (body.description !== undefined) data.description = body.description;
    if (body.instructions !== undefined) data.instructions = body.instructions;

    const updated = await db.exam.update({ where: { id }, data });
    return NextResponse.json(updated);
  } catch (error) {
    console.error("PATCH /api/exams/[id] failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const { id } = await params;
    const existing = await db.exam.findUnique({ where: { id } });
    if (!existing) return new NextResponse("Exam not found", { status: 404 });

    await db.exam.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Exam deleted" });
  } catch (error) {
    console.error("DELETE /api/exams/[id] failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
