import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const subject = await db.subject.findUnique({
      where: { id },
      include: { teacher: { include: { user: { select: { name: true } } } } },
    });
    if (!subject) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: subject });
  } catch (error) {
    console.error("GET /api/subjects/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const json = await req.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const existing = await db.subject.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    const normalizedClassId =
      !json.classId || json.classId === "" || json.classId === "none"
        ? null
        : json.classId;
    const normalizedTeacherId =
      !json.teacherId || json.teacherId === "" || json.teacherId === "none"
        ? null
        : json.teacherId;

    const updated = await db.subject.update({
      where: { id },
      data: {
        name: json.name ?? existing.name,
        code: json.code ?? existing.code,
        classId: normalizedClassId,
        teacherId: normalizedTeacherId,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/subjects/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.subject.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Subject not found" }, { status: 404 });
    }

    await db.subject.delete({ where: { id } });
    return NextResponse.json({ success: true, message: "Subject deleted" });
  } catch (error) {
    console.error("DELETE /api/subjects/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
