import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function GET() {
  const session = await getServerSession(authOption);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role === "ADMIN") {
    const leaves = await db.leave.findMany({
      include: {
        staff: {
          include: { user: { select: { name: true, email: true } } },
        },
        student: {
          include: { user: { select: { name: true, email: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: leaves });
  }

  if (session.user.role === "STAFF") {
    const staff = await db.staff.findUnique({ where: { userId: session.user.id } });
    if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

    const leaves = await db.leave.findMany({
      where: { staffId: staff.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: leaves });
  }

  if (session.user.role === "STUDENT") {
    const student = await db.student.findUnique({ where: { userId: session.user.id } });
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

    const leaves = await db.leave.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json({ data: leaves });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOption);
  if (!session?.user || !["ADMIN", "STAFF", "STUDENT"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.fromDate || !body.toDate || !body.reason) {
    return NextResponse.json({ error: "fromDate, toDate, reason required" }, { status: 400 });
  }

  if (session.user.role === "STAFF") {
    const staff = await db.staff.findUnique({ where: { userId: session.user.id } });
    if (!staff) return NextResponse.json({ error: "Staff record not found" }, { status: 404 });

    const leave = await db.leave.create({
      data: {
        staffId: staff.id,
        fromDate: new Date(body.fromDate),
        toDate: new Date(body.toDate),
        reason: body.reason,
        status: "PENDING",
      },
    });
    return NextResponse.json({ data: leave }, { status: 201 });
  }

  if (session.user.role === "STUDENT") {
    const student = await db.student.findUnique({ where: { userId: session.user.id } });
    if (!student) return NextResponse.json({ error: "Student record not found" }, { status: 404 });

    const leave = await db.leave.create({
      data: {
        studentId: student.id,
        fromDate: new Date(body.fromDate),
        toDate: new Date(body.toDate),
        reason: body.reason,
        status: "PENDING",
      },
    });
    return NextResponse.json({ data: leave }, { status: 201 });
  }

  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}
