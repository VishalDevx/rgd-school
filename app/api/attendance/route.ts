// app/api/attendance/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authOption } from "@/app/lib/auth";
import { getServerSession } from "next-auth/next";
import { logger } from "@/app/lib/logger";
import type { AttendanceStatus } from "@/lib/enums";

const log = logger("attendance-route");

// ------------------ TYPES ------------------

interface AttendanceRecordInput {
  studentId: string;
  status: AttendanceStatus;
}


interface RawAttendanceRecord {
  studentId: unknown;
  status: unknown;
}

// ------------------ GET ATTENDANCE ------------------

export async function GET(_request: NextRequest) {
  const url = new URL(_request.url);
  const classId = url.searchParams.get("classId");
  const dateStr = url.searchParams.get("date");

  if (!classId || !dateStr) {
    return NextResponse.json(
      { error: "Missing classId or date" },
      { status: 400 }
    );
  }

  const startDate = new Date(dateStr);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 1);

  try {
    const items = await db.attendance.findMany({
      where: {
        classId,
        date: { gte: startDate, lt: endDate },
      },
      include: {
        student: { include: { user: true } },
        class: true,
        markedBy: true,
      },
      orderBy: { date: "asc" },
    });

    return NextResponse.json({ success: true, data: items });
  } catch (err: unknown) {
    log.error("GET /attendance error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// ------------------ SAVE/UPDATE ATTENDANCE ------------------

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOption);

    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staff = await db.staff.findUnique({
      where: { userId: session.user.id },
    });

    if (!staff) {
      return NextResponse.json(
        { error: "Staff record not found" },
        { status: 404 }
      );
    }

    // Parse payload
    const raw = await request.json().catch(() => null);

    if (!raw || typeof raw.classId !== "string" || !Array.isArray(raw.records)) {
      return NextResponse.json(
        { error: "Invalid payload" },
        { status: 400 }
      );
    }

    // Validate and normalize each record
    const records: AttendanceRecordInput[] = raw.records.map(
      (r: RawAttendanceRecord) => {
        if (typeof r.studentId !== "string") {
          throw new Error("Invalid studentId");
        }

        const status = String(r.status).toUpperCase();
        if (!["PRESENT", "ABSENT", "LEAVE"].includes(status)) {
          throw new Error(`Invalid attendance status: ${r.status}`);
        }

        return {
          studentId: r.studentId,
          status: status as AttendanceStatus,
        };
      }
    );

    const date = new Date(raw.date || new Date());
    date.setHours(0, 0, 0, 0);

    // NOTE: this used to be db.$transaction. MongoDB Atlas free tier has no
  // replica set, so multi-document transactions are unavailable. Every write
  // here is an idempotent upsert keyed on (studentId, date), so a partial
  // application is safe: the client can retry the request and converge on the
  // same state.
  const results: typeof records = [];

  for (const record of records) {
    const att = await db.attendance.upsert({
      where: {
        studentId_date: {
          studentId: record.studentId,
          date,
        },
      },
      update: { status: record.status },
      create: {
        classId: raw.classId,
        studentId: record.studentId,
        date,
        status: record.status,
        markedById: staff.id,
      },
    });

    results.push({ studentId: att.studentId, status: att.status });
  }

  const created = results;

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (err: unknown) {
    log.error("POST /attendance error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
