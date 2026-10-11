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
    const date = searchParams.get("date");

    if (session.user.role === "ADMIN") {
      const where: Record<string, unknown> = {};
      if (date) {
        const d = new Date(date);
        where.date = {
          gte: new Date(d.setHours(0, 0, 0, 0)),
          lt: new Date(d.setHours(23, 59, 59, 999)),
        };
      }

      const attendance = await db.staffAttendance.findMany({
        where,
        include: {
          staff: {
            include: { user: { select: { name: true, email: true } } },
          },
        },
        orderBy: { date: "desc" },
      });

      return NextResponse.json({ success: true, data: attendance });
    }

    if (session.user.role === "STAFF") {
      const staff = await db.staff.findUnique({
        where: { userId: session.user.id },
      });
      if (!staff) {
        return NextResponse.json({ error: "Staff not found" }, { status: 404 });
      }

      const where: Record<string, unknown> = { staffId: staff.id };
      if (date) {
        const d = new Date(date);
        where.date = {
          gte: new Date(d.setHours(0, 0, 0, 0)),
          lt: new Date(d.setHours(23, 59, 59, 999)),
        };
      }

      const attendance = await db.staffAttendance.findMany({
        where,
        include: {
          staff: {
            include: { user: { select: { name: true, email: true } } },
          },
        },
        orderBy: { date: "desc" },
      });

      return NextResponse.json({ success: true, data: attendance });
    }

    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  } catch (error) {
    console.error("GET /api/staff-attendance error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.staffId || !body.date || !body.status) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const date = new Date(body.date);
    date.setHours(0, 0, 0, 0);

    const attendance = await db.staffAttendance.upsert({
      where: {
        staffId_date: { staffId: body.staffId, date },
      },
      update: { status: body.status },
      create: {
        staffId: body.staffId,
        date,
        status: body.status,
      },
    });

    return NextResponse.json({ success: true, data: attendance }, { status: 201 });
  } catch (error) {
    console.error("POST /api/staff-attendance error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
