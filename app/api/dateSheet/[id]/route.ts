import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const entry = await db.examDateSheet.findUnique({
      where: { id },
      include: { exam: true, class: true, subject: true },
    });
    if (!entry) {
      return new NextResponse("Exam date sheet not found", { status: 404 });
    }
    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    console.error("GET /api/dateSheet/[id] failed:", error);
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

    const existing = await db.examDateSheet.findUnique({ where: { id } });
    if (!existing) return new NextResponse("Exam date sheet not found", { status: 404 });

    const data: Record<string, unknown> = {};
    if (body.examId) data.examId = body.examId;
    if (body.classId) data.classId = body.classId;
    if (body.subjectId) data.subjectId = body.subjectId;
    if (body.examDate) data.examDate = new Date(body.examDate);
    if (body.startTime) data.startTime = new Date(body.startTime);
    if (body.endTime) data.endTime = new Date(body.endTime);
    if (body.room !== undefined) data.room = body.room;

    const updated = await db.examDateSheet.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/dateSheet/[id] failed:", error);
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
    const existing = await db.examDateSheet.findUnique({ where: { id } });
    if (!existing) return new NextResponse("Exam date sheet not found", { status: 404 });

    await db.examDateSheet.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Exam date sheet deleted" });
  } catch (error) {
    console.error("DELETE /api/dateSheet/[id] failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
