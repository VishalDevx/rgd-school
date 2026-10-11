import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeCron, executeCronJob } from "@/app/lib/cron";

export async function POST(req: NextRequest) {
  if (!(await authorizeCron(req))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return executeCronJob("daily-digest", async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      newAdmissions,
      attendanceTodayCount,
      feesCollectedToday,
      totalActiveStudents,
      totalActiveStaff,
      pendingFeeCount,
      newLeaves,
    ] = await Promise.all([
      db.student.count({ where: { admissionDate: { gte: todayStart, lt: todayEnd } } }),
      db.attendance.count({ where: { date: { gte: todayStart, lt: todayEnd } } }),
      db.feePayment.aggregate({
        _sum: { amountPaid: true },
        where: { createdAt: { gte: todayStart, lt: todayEnd }, status: "PAID" },
      }),
      db.student.count({ where: { active: true } }),
      db.staff.count({ where: { active: true } }),
      db.feePayment.count({ where: { status: { in: ["PENDING", "PARTIAL"] }, remainAmount: { gt: 0 } } }),
      db.leave.count({ where: { createdAt: { gte: todayStart, lt: todayEnd } } }),
    ]);

    const monthlyFeeCollection = await db.feePayment.aggregate({
      _sum: { amountPaid: true },
      where: { createdAt: { gte: monthStart }, status: "PAID" },
    });

    const dateStr = now.toLocaleDateString("en-IN", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    const message = [
      `📊 Daily Digest — ${dateStr}`,
      ``,
      `👨‍🎓 Students: ${totalActiveStudents} active (${newAdmissions} new today)`,
      `👨‍🏫 Staff: ${totalActiveStaff} active`,
      `📋 Attendance: ${attendanceTodayCount} records marked today`,
      `💰 Fees Collected Today: ₹${Number(feesCollectedToday._sum.amountPaid ?? 0).toLocaleString()}`,
      `📈 Monthly Collection: ₹${Number(monthlyFeeCollection._sum.amountPaid ?? 0).toLocaleString()}`,
      `⚠️ Pending Fees: ${pendingFeeCount} payments`,
      `📝 New Leave Requests: ${newLeaves}`,
    ].join("\n");

    const admins = await db.user.findMany({
      where: { role: "ADMIN", isActive: true },
      select: { id: true },
    });

    if (admins.length > 0) {
      await db.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id,
          type: "GENERAL",
          title: `Daily Digest — ${dateStr}`,
          message,
        })),
      });
    }

    return {
      success: true,
      message: `Daily digest sent to ${admins.length} admin(s)`,
      stats: {
        newAdmissions,
        attendanceToday: attendanceTodayCount,
        feesCollected: Number(feesCollectedToday._sum.amountPaid ?? 0),
        totalActiveStudents,
        totalActiveStaff,
        pendingFeeCount,
        newLeaves,
        adminsNotified: admins.length,
      },
      durationMs: 0,
    };
  });
}
