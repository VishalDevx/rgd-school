import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOption);
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const usesTransport = searchParams.get("usesTransport");
  const classId = searchParams.get("classId");

  const where: Record<string, unknown> = {};
  if (usesTransport === "true") where.usesTransport = true;
  if (usesTransport === "false") where.usesTransport = false;
  if (classId) where.classId = classId;

  const students = await db.student.findMany({
    where: { ...where, active: true },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      class: { select: { name: true } },
    },
    orderBy: { rollNumber: "asc" },
  });

  return NextResponse.json(students);
}

export async function PATCH(req: NextRequest) {
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

  const usesTransport = body.usesTransport === true || body.usesTransport === "true";

  const updated = await db.student.update({
    where: { id: body.studentId },
    data: { usesTransport },
    include: {
      user: { select: { name: true } },
      class: { select: { name: true } },
    },
  });

  if (usesTransport) {
    const existing = await db.transportAssignment.findUnique({
      where: { studentId: body.studentId },
    });
    if (!existing) {
      await db.transportAssignment.create({
        data: { studentId: body.studentId, isActive: true },
      });
    } else {
      await db.transportAssignment.update({
        where: { studentId: body.studentId },
        data: { isActive: true },
      });
    }
  } else {
    await db.transportAssignment.updateMany({
      where: { studentId: body.studentId },
      data: { isActive: false },
    });
  }

  return NextResponse.json(updated);
}
