import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "STAFF") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get staff record
    const staff = await db.staff.findUnique({
      where: { userId: session.user.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            image: true,
          },
        },
      },
    });

    if (!staff) {
      return NextResponse.json({ error: "Staff not found" }, { status: 404 });
    }

    if (!staff.active) {
      return NextResponse.json({ error: "Account deactivated. Contact admin." }, { status: 403 });
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Get classes assigned to this staff
    const classes = await db.class.findMany({
      where: { teacherId: staff.id },
      include: {
        students: {
          include: {
            user: {
              select: { name: true },
            },
          },
        },
        subjects: true,
        academicSession: true,
      },
    });

    const totalStudents = classes.reduce((sum, cls) => sum + cls.students.length, 0);

    // Get today's attendance marked by this staff
    const attendanceToday = await db.attendance.count({
      where: {
        markedById: staff.id,
        date: { gte: startOfToday, lte: endOfToday },
      },
    });

    // Get exams for staff's classes
    const exams = await db.exam.findMany({
      where: {
        classId: { in: classes.map((c) => c.id) },
      },
      include: {
        class: true,
      },
      orderBy: { startDate: "asc" },
    });

    const upcomingExams = exams.filter((exam) => new Date(exam.startDate) >= now);
    const pastExams = exams.filter((exam) => new Date(exam.endDate) < now);

    // Get results uploaded by this staff
    const resultsCount = await db.result.count({
      where: {
        uploadedBy: session.user.id,
      },
    });

    // Get recent announcements
    const announcements = await db.announcement.findMany({
      where: {
        visibleRoles: {
          some: {
            role: { in: ["STAFF", "ADMIN"] },
          },
        },
      },
      include: {
        creator: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    // Get recent attendance records
    const recentAttendance = await db.attendance.findMany({
      where: {
        markedById: staff.id,
      },
      include: {
        student: {
          include: {
            user: {
              select: { name: true },
            },
          },
        },
        class: {
          select: { name: true },
        },
      },
      orderBy: { date: "desc" },
      take: 10,
    });

    // Get subjects assigned to this staff
    const subjects = await db.subject.findMany({
      where: { teacherId: staff.id },
      include: {
        class: {
          select: { name: true },
        },
      },
    });

    // ----- Attendance trend (last 7 days for staff's classes) -----
    const classIds = classes.map((c) => c.id);
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - (6 - i));
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);
      return { label: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), dayStart, dayEnd };
    });

    const attendanceTrend = await Promise.all(
      last7Days.map(async (d) => {
        const [present, total] = await Promise.all([
          db.attendance.count({ where: { classId: { in: classIds }, date: { gte: d.dayStart, lte: d.dayEnd }, status: "PRESENT" } }),
          db.attendance.count({ where: { classId: { in: classIds }, date: { gte: d.dayStart, lte: d.dayEnd } } }),
        ]);
        return {
          date: d.label,
          percentage: total > 0 ? Math.round((present / total) * 100) : 0,
        };
      })
    );

    // ----- Fee overview for staff's students -----
    const studentIds = classes.flatMap((c) => c.students.map((s: { id: string }) => s.id));
    let feeOverview = { paid: 0, pending: 0, overdue: 0 };
    if (studentIds.length > 0) {
      const [paidAgg, partialAgg, outstandingAgg] = await Promise.all([
        db.feePayment.aggregate({ _sum: { amountPaid: true }, where: { studentId: { in: studentIds }, status: "PAID" } }),
        db.feePayment.aggregate({ _sum: { amountPaid: true }, where: { studentId: { in: studentIds }, status: "PARTIAL" } }),
        db.feePayment.aggregate({ _sum: { remainAmount: true }, where: { studentId: { in: studentIds }, remainAmount: { gt: 0 } } }),
      ]);
      feeOverview = {
        paid: Number(paidAgg._sum.amountPaid ?? 0),
        pending: Number(partialAgg._sum.amountPaid ?? 0),
        overdue: Number(outstandingAgg._sum.remainAmount ?? 0),
      };
    }

    return NextResponse.json({
      staff: {
        id: staff.id,
        designation: staff.designation,
        joinDate: staff.joinDate,
        active: staff.active,
        user: staff.user,
      },
      stats: {
        totalClasses: classes.length,
        totalStudents,
        attendanceToday,
        totalExams: exams.length,
        upcomingExams: upcomingExams.length,
        pastExams: pastExams.length,
        resultsCount,
        subjectsCount: subjects.length,
      },
      classes,
      upcomingExams: upcomingExams.slice(0, 5),
      recentAttendance,
      announcements,
      subjects,
      charts: {
        attendanceTrend,
        feeOverview,
      },
    });
  } catch (error) {
    console.error("Error fetching staff dashboard:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
