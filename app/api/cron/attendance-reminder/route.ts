import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeCron, executeCronJob } from "@/app/lib/cron";

export async function POST(req: NextRequest) {
  if (!(await authorizeCron(req))) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return executeCronJob("attendance-reminder", async () => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const end = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    const absences = await db.attendance.findMany({
      where: {
        status: "ABSENT",
        date: { gte: start, lt: end },
      },
      include: {
        student: { include: { user: true } },
      },
    });

    if (absences.length > 0) {
      await db.notification.createMany({
        data: absences.map((a) => ({
          userId: a.student.userId,
          type: "ATTENDANCE_ALERT" as const,
          title: "Attendance Alert",
          message: `You were marked ABSENT on ${start.toDateString()}`,
        })),
      });
    }

    return {
      success: true,
      message: `Attendance alerts sent: ${absences.length}`,
      stats: { absentToday: absences.length },
      durationMs: 0,
    };
  });
}
