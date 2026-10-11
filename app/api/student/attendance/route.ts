import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";
import type { WhereInput } from "@/lib/types";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    // Get student record
    const student = await db.student.findUnique({
      where: { userId: session.user.id },
      include: {
        class: true,
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (!student.active) {
      return NextResponse.json({ error: "Account deactivated. Contact admin." }, { status: 403 });
    }

    // Build date filter
    let dateFilter: WhereInput = {};
    if (month && year) {
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      dateFilter = {
        date: {
          gte: startDate,
          lte: endDate,
        },
      };
    }

    // Get attendance records
    const attendance = await db.attendance.findMany({
      where: {
        studentId: student.id,
        ...dateFilter,
      },
      include: {
        markedBy: {
          include: {
            user: {
              select: { name: true },
            },
          },
        },
        class: {
          select: {
            name: true,
            grade: true,
            section: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    // Calculate stats
    const total = attendance.length;
    const present = attendance.filter((a) => a.status === "PRESENT").length;
    const absent = attendance.filter((a) => a.status === "ABSENT").length;
    const late = attendance.filter((a) => a.status === "LATE").length;
    const leave = attendance.filter((a) => a.status === "LEAVE").length;

    const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

    // Get monthly attendance for chart
    const monthlyAttendance = await db.attendance.findMany({
      where: { studentId: student.id },
      select: {
        date: true,
        status: true,
      },
      orderBy: { date: "asc" },
    });

    // Group by month
    const monthlyStats: Record<string, { present: number; total: number }> = {};
    monthlyAttendance.forEach((a) => {
      const monthKey = `${a.date.getFullYear()}-${String(a.date.getMonth() + 1).padStart(2, "0")}`;
      if (!monthlyStats[monthKey]) {
        monthlyStats[monthKey] = { present: 0, total: 0 };
      }
      monthlyStats[monthKey].total++;
      if (a.status === "PRESENT") {
        monthlyStats[monthKey].present++;
      }
    });

    return NextResponse.json({
      attendance,
      stats: {
        total,
        present,
        absent,
        late,
        leave,
        percentage,
      },
      monthlyStats: Object.entries(monthlyStats).map(([month, stats]) => ({
        month,
        present: stats.present,
        total: stats.total,
        percentage: stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0,
      })),
      student: {
        id: student.id,
        admissionNo: student.admissionNo,
        rollNumber: student.rollNumber,
        class: student.class
          ? {
              name: student.class.name,
              grade: student.class.grade,
              section: student.class.section,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error fetching student attendance:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
