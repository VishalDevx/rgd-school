import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get student record
    const student = await db.student.findUnique({
      where: { userId: session.user.id },
      include: {
        class: {
          include: {
            academicSession: true,
            teacher: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (!student.active) {
      return NextResponse.json({ error: "Account deactivated. Contact admin." }, { status: 403 });
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // Get attendance stats
    const totalAttendance = await db.attendance.count({
      where: { studentId: student.id },
    });

    const presentCount = await db.attendance.count({
      where: {
        studentId: student.id,
        status: "PRESENT",
      },
    });

    const absentCount = await db.attendance.count({
      where: { studentId: student.id, status: "ABSENT" },
    });

    const lateCount = await db.attendance.count({
      where: { studentId: student.id, status: "LATE" },
    });

    const leaveCount = await db.attendance.count({
      where: { studentId: student.id, status: "LEAVE" },
    });

    const attendancePercentage =
      totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;

    // Get fees stats
    const feePayments = await db.feePayment.findMany({
      where: { studentId: student.id },
      include: { feeStructure: true },
      orderBy: { createdAt: "desc" },
    });

    const totalFeesPaid = feePayments.reduce(
      (sum, payment) => sum + Number(payment.amountPaid),
      0
    );
    const totalFeesPending = feePayments.reduce(
      (sum, payment) => sum + Number(payment.remainAmount),
      0
    );

    const pendingPayments = feePayments.filter(
      (p) => p.status === "PENDING" || p.status === "PARTIAL"
    ).length;

    // Get results stats
    const results = await db.result.findMany({
      where: { studentId: student.id },
      include: {
        exam: true,
        subject: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const totalExams = await db.exam.count({
      where: { classId: student.classId || "" },
    });

    // Get recent announcements
    const announcements = await db.announcement.findMany({
      where: {
        visibleRoles: {
          some: {
            role: "STUDENT",
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

    // Get upcoming exams
    const upcomingExams = await db.exam.findMany({
      where: {
        classId: student.classId || "",
        startDate: { gte: now },
      },
      include: {
        class: true,
        dateSheet: {
          include: {
            subject: true,
          },
        },
      },
      orderBy: { startDate: "asc" },
      take: 5,
    });

    // Get recent attendance
    const recentAttendance = await db.attendance.findMany({
      where: { studentId: student.id },
      orderBy: { date: "desc" },
      take: 10,
    });

    // Get notifications
    const notifications = await db.notification.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    const unreadNotifications = notifications.filter((n) => !n.read).length;

    return NextResponse.json({
      student: {
        id: student.id,
        admissionNo: student.admissionNo,
        rollNumber: student.rollNumber,
        class: student.class
          ? {
              id: student.class.id,
              name: student.class.name,
              grade: student.class.grade,
              section: student.class.section,
              teacher: student.class.teacher
                ? {
                    name: student.class.teacher.user.name,
                  }
                : null,
            }
          : null,
      },
      stats: {
        attendance: {
          total: totalAttendance,
          present: presentCount,
          absent: absentCount,
          late: lateCount,
          leave: leaveCount,
          percentage: attendancePercentage,
        },
        fees: {
          totalPaid: totalFeesPaid,
          totalPending: totalFeesPending,
          pendingPayments,
        },
        results: {
          totalExams,
          resultsCount: results.length,
        },
        notifications: {
          unread: unreadNotifications,
          total: notifications.length,
        },
      },
      recent: {
        announcements,
        upcomingExams,
        recentAttendance,
        notifications,
      },
    });
  } catch (error) {
    console.error("Error fetching student dashboard:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
