import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const dayOfWeek = searchParams.get("dayOfWeek");

    const where: Record<string, unknown> = {};
    if (classId) where.classId = classId;
    if (dayOfWeek) where.dayOfWeek = parseInt(dayOfWeek);

    const entries = await db.timetable.findMany({
      where,
      include: {
        subject: { select: { name: true, code: true } },
        teacher: { include: { user: { select: { name: true } } } },
        class: { select: { name: true } },
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });

    return NextResponse.json({ success: true, data: entries });
  } catch (error) {
    console.error("GET /api/timetable failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch timetable" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { classId, subjectId, teacherId, dayOfWeek, startTime, endTime, room } = json;

    if (
      !classId ||
      !subjectId ||
      dayOfWeek === undefined ||
      !startTime ||
      !endTime
    ) {
      return NextResponse.json(
        { error: "Missing required fields: classId, subjectId, dayOfWeek, startTime, endTime" },
        { status: 400 }
      );
    }

    const created = await db.timetable.create({
      data: {
        classId,
        subjectId,
        teacherId: teacherId ?? null,
        dayOfWeek,
        startTime,
        endTime,
        room: room ?? null,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/timetable failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
