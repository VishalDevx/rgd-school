import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function GET() {
  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const assignments = await db.transportAssignment.findMany({
    include: {
      student: {
        include: {
          user: { select: { name: true, email: true } },
          class: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(assignments);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.studentId) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }

  const student = await db.student.findUnique({ where: { id: body.studentId } });
  if (!student) {
    return NextResponse.json({ error: "Student not found" }, { status: 404 });
  }

  const existing = await db.transportAssignment.findUnique({
    where: { studentId: body.studentId },
  });

  if (existing) {
    const updated = await db.transportAssignment.update({
      where: { studentId: body.studentId },
      data: {
        routeName: body.routeName ?? existing.routeName,
        stopName: body.stopName ?? existing.stopName,
        busNumber: body.busNumber ?? existing.busNumber,
        driverName: body.driverName ?? existing.driverName,
        driverPhone: body.driverPhone ?? existing.driverPhone,
        feeAmount: body.feeAmount != null ? Number(body.feeAmount) : existing.feeAmount,
        isActive: body.isActive ?? existing.isActive,
      },
      include: {
        student: {
          include: {
            user: { select: { name: true } },
            class: { select: { name: true } },
          },
        },
      },
    });

    if (body.isActive !== undefined && !existing.isActive !== !body.isActive) {
      await db.student.update({
        where: { id: body.studentId },
        data: { usesTransport: body.isActive },
      });
    }

    return NextResponse.json(updated);
  }

  const created = await db.transportAssignment.create({
    data: {
      studentId: body.studentId,
      routeName: body.routeName ?? null,
      stopName: body.stopName ?? null,
      busNumber: body.busNumber ?? null,
      driverName: body.driverName ?? null,
      driverPhone: body.driverPhone ?? null,
      feeAmount: body.feeAmount != null ? Number(body.feeAmount) : null,
      isActive: body.isActive ?? true,
    },
    include: {
      student: {
        include: {
          user: { select: { name: true } },
          class: { select: { name: true } },
        },
      },
    },
  });

  await db.student.update({
    where: { id: body.studentId },
    data: { usesTransport: true },
  });

  return NextResponse.json(created, { status: 201 });
}
