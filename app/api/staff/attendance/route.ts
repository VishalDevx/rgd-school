import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/app/lib/apiAuth";
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
  const auth = await requireRole("ADMIN", "STAFF");
  if (!auth.ok) return auth.response;
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

  // Staff may only mark attendance as themselves; admins may act for any staff.
  let markedById = body.staffId;
  if (auth.session.user.role === "STAFF") {
    const self = await db.staff.findUnique({ where: { userId: auth.session.user.id } });
    if (!self) return NextResponse.json({ message: "Staff profile not found" }, { status: 403 });
    markedById = self.id;
  }

  try {
    await db.attendance.createMany({
      data: body.records.map((r) => ({
        classId: body.classId,
        studentId: r.studentId,
        date: new Date(body.date),
        status: r.status,
        markedById,
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
