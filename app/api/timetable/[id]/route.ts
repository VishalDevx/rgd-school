import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

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
    const json = await req.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const existing = await db.timetable.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Timetable entry not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (json.classId !== undefined) updateData.classId = json.classId;
    if (json.subjectId !== undefined) updateData.subjectId = json.subjectId;
    if (json.teacherId !== undefined) updateData.teacherId = json.teacherId || null;
    if (json.dayOfWeek !== undefined) updateData.dayOfWeek = json.dayOfWeek;
    if (json.startTime !== undefined) updateData.startTime = json.startTime;
    if (json.endTime !== undefined) updateData.endTime = json.endTime;
    if (json.room !== undefined) updateData.room = json.room || null;

    const updated = await db.timetable.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/timetable/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const existing = await db.timetable.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Timetable entry not found" }, { status: 404 });
    }

    await db.timetable.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/timetable/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
