import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { AttendanceStatus } from "@/lib/enums";

interface AttendanceRecord {
  studentId: string;
  status: AttendanceStatus;
}

interface AttendanceBody {
  classId: string;
  date: string;
  staffId: string;
  records: AttendanceRecord[];
}

export async function POST(req: NextRequest) {
  const body: AttendanceBody = await req.json().catch(() => null);
  if (
    !body ||
    !body.classId ||
    !body.date ||
    !body.staffId ||
    !Array.isArray(body.records) ||
    body.records.length === 0
  ) {
    return NextResponse.json({ message: "Invalid payload" }, { status: 400 });
  }

  try {
    await db.attendance.createMany({
      data: body.records.map((r) => ({
        classId: body.classId,
        studentId: r.studentId,
        date: new Date(body.date),
        status: r.status,
        markedById: body.staffId,
      })),
      skipDuplicates: true,
    });

    return NextResponse.json({ message: "Attendance saved" });
  } catch (err: unknown) {
    console.error("Attendance save error:", err);
    return NextResponse.json(
      { message: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
