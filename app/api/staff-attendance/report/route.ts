import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const staffId = searchParams.get("staffId");
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);

    const where: Record<string, unknown> = {
      date: { gte: startDate, lte: endDate },
    };

    if (staffId) {
      where.staffId = staffId;
    } else if (session.user.role === "STAFF") {
      const staff = await db.staff.findUnique({
        where: { userId: session.user.id },
      });
      if (!staff) {
        return NextResponse.json({ error: "Staff not found" }, { status: 404 });
      }
      where.staffId = staff.id;
    }

    const records = await db.staffAttendance.findMany({
      where,
      include: {
        staff: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
    });

    const counts = {
      PRESENT: 0,
      ABSENT: 0,
      LATE: 0,
      LEAVE: 0,
      HALF_DAY: 0,
    };

    records.forEach((r) => {
      if (r.status in counts) {
        counts[r.status as keyof typeof counts]++;
      }
    });

    const total = records.length;
    const percentage = total > 0 ? Math.round((counts.PRESENT / total) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        month,
        year,
        total,
        counts,
        percentage,
        records,
      },
    });
  } catch (error) {
    console.error("GET /api/staff-attendance/report error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
