import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const cls = await db.class.findUnique({
      where: { id },
      include: { teacher: { include: { user: { select: { name: true } } } }, academicSession: true },
    });
    if (!cls) return new NextResponse("Class not found", { status: 404 });
    return NextResponse.json({ success: true, data: cls });
  } catch (error) {
    console.error("GET /api/classes/[id] failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) return new NextResponse("Invalid payload", { status: 400 });

    const existing = await db.class.findUnique({ where: { id } });
    if (!existing) return new NextResponse("Class not found", { status: 404 });

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.grade !== undefined) data.grade = body.grade;
    if (body.section !== undefined) data.section = body.section;
    if (body.gradeCode !== undefined) data.gradeCode = body.gradeCode;
    if (body.teacherId !== undefined) data.teacherId = body.teacherId || null;
    if (body.academicSessionId !== undefined) data.academicSessionId = body.academicSessionId;

    const updated = await db.class.update({ where: { id }, data });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/classes/[id] failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }
    const { id } = await params;
    const existing = await db.class.findUnique({ where: { id } });
    if (!existing) return new NextResponse("Class not found", { status: 404 });

    await db.class.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Class deleted" });
  } catch (error) {
    console.error("DELETE /api/classes/[id] failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
