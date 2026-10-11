import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";
import type { WhereInput } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const classId = searchParams.get("classId");
    const studentId = searchParams.get("studentId");

    const where: WhereInput = {};
    if (fromDate || toDate) {
      where.date = {};
      if (fromDate) where.date.gte = new Date(fromDate);
      if (toDate) where.date.lte = new Date(toDate);
    }
    if (classId) where.classId = classId;
    if (studentId) where.studentId = studentId;

    const records = await db.attendance.findMany({
      where,
      include: {
        student: {
          include: { user: { select: { name: true } } },
        },
        class: { select: { name: true } },
      },
      orderBy: { date: "asc" },
    });

    const totalDays = new Set(records.map((r) => r.date.toISOString().slice(0, 10))).size;
    let presentCount = 0;
    let absentCount = 0;
    let lateCount = 0;
    let leaveCount = 0;

    for (const r of records) {
      switch (r.status) {
        case "PRESENT": presentCount++; break;
        case "ABSENT": absentCount++; break;
        case "LATE": lateCount++; break;
        case "LEAVE": leaveCount++; break;
      }
    }

    const totalRecords = records.length;
    const percentage = totalRecords > 0
      ? Number((((presentCount + lateCount) / totalRecords) * 100).toFixed(2))
      : 0;

    const details = records.map((r) => ({
      date: r.date,
      status: r.status,
      studentName: r.student.user.name,
      className: r.class.name,
      studentId: r.studentId,
    }));

    return NextResponse.json({
      summary: { totalDays, presentCount, absentCount, lateCount, leaveCount, percentage },
      details,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
