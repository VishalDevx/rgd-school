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
    const classId = searchParams.get("classId");
    const subjectId = searchParams.get("subjectId");

    const where: Record<string, unknown> = {};

    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;

    if (session.user.role === "STAFF") {
      const staff = await db.staff.findUnique({
        where: { userId: session.user.id },
      });
      if (!staff) {
        return NextResponse.json({ error: "Staff not found" }, { status: 404 });
      }
      where.teacherId = staff.id;
    }

    if (session.user.role === "STUDENT") {
      const student = await db.student.findUnique({
        where: { userId: session.user.id },
        select: { classId: true },
      });
      if (student?.classId) {
        where.classId = student.classId;
      }
    }

    const homework = await db.homework.findMany({
      where,
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        teacher: {
          include: { user: { select: { name: true } } },
        },
        _count: { select: { submissions: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: homework });
  } catch (error) {
    console.error("GET /api/homework error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const staff = await db.staff.findUnique({
      where: { userId: session.user.id },
    });
    if (!staff) {
      return NextResponse.json({ error: "Staff record not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.classId || !body.subjectId || !body.title || !body.dueDate) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const homework = await db.homework.create({
      data: {
        classId: body.classId,
        subjectId: body.subjectId,
        teacherId: staff.id,
        title: body.title,
        description: body.description || null,
        dueDate: new Date(body.dueDate),
        attachment: body.attachment || null,
      },
    });

    return NextResponse.json({ success: true, data: homework }, { status: 201 });
  } catch (error) {
    console.error("POST /api/homework error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
