import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeCron, executeCronJob } from "@/app/lib/cron";

export async function POST(req: NextRequest) {
  if (!(await authorizeCron(req))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return executeCronJob("fee-reminder", async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const sevenDaysLater = new Date(todayStart);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const pendingPayments = await db.feePayment.findMany({
      where: {
        status: { in: ["PENDING", "PARTIAL"] },
        remainAmount: { gt: 0 },
      },
      include: {
        student: {
          include: { user: { select: { id: true, name: true } } },
        },
        feeStructure: { select: { name: true, dueDate: true } },
      },
    });

    const dueSoon = pendingPayments.filter((p) => {
      if (!p.feeStructure?.dueDate) return false;
      const due = new Date(p.feeStructure.dueDate);
      return due >= todayStart && due <= sevenDaysLater;
    });

    const overdue = pendingPayments.filter((p) => {
      if (!p.feeStructure?.dueDate) return false;
      return new Date(p.feeStructure.dueDate) < todayStart;
    });

    const notifications: { userId: string; type: "FEE_REMINDER"; title: string; message: string }[] = [];

    for (const payment of dueSoon) {
      const dueDate = payment.feeStructure?.dueDate
        ? new Date(payment.feeStructure.dueDate).toLocaleDateString("en-IN")
        : "soon";
      notifications.push({
        userId: payment.student.userId,
        type: "FEE_REMINDER",
        title: "Fee Due Reminder",
        message: `Your fee of ₹${Number(payment.remainAmount).toLocaleString()} is due by ${dueDate}. Please pay to avoid late fees.`,
      });
    }

    for (const payment of overdue) {
      const dueDate = payment.feeStructure?.dueDate
        ? new Date(payment.feeStructure.dueDate).toLocaleDateString("en-IN")
        : "N/A";
      notifications.push({
        userId: payment.student.userId,
        type: "FEE_REMINDER",
        title: "Fee Overdue",
        message: `Your fee of ₹${Number(payment.remainAmount).toLocaleString()} was due on ${dueDate}. Please pay immediately to avoid penalties.`,
      });
    }

    if (notifications.length > 0) {
      await db.notification.createMany({ data: notifications });
    }

    return {
      success: true,
      message: `Fee reminders sent: ${notifications.length} (${dueSoon.length} due soon, ${overdue.length} overdue)`,
      stats: {
        dueSoon: dueSoon.length,
        overdue: overdue.length,
        notificationsSent: notifications.length,
      },
      durationMs: 0,
    };
  });
}
