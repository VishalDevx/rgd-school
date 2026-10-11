import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const homework = await db.homework.findUnique({
      where: { id },
      include: {
        class: { select: { id: true, name: true } },
        subject: { select: { id: true, name: true } },
        teacher: {
          include: { user: { select: { name: true, email: true } } },
        },
        submissions: {
          include: {
            student: {
              include: { user: { select: { name: true, email: true } } },
            },
          },
          orderBy: { submittedAt: "desc" },
        },
      },
    });

    if (!homework) {
      return NextResponse.json({ error: "Homework not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: homework });
  } catch (error) {
    console.error("GET /api/homework/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const homework = await db.homework.findUnique({ where: { id } });
    if (!homework) {
      return NextResponse.json({ error: "Homework not found" }, { status: 404 });
    }

    const staff = await db.staff.findUnique({
      where: { userId: session.user.id },
    });

    if (homework.teacherId !== staff?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const updated = await db.homework.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.dueDate && { dueDate: new Date(body.dueDate) }),
        ...(body.attachment !== undefined && { attachment: body.attachment }),
        ...(body.classId && { classId: body.classId }),
        ...(body.subjectId && { subjectId: body.subjectId }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/homework/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const homework = await db.homework.findUnique({
      where: { id },
      include: { teacher: true },
    });
    if (!homework) {
      return NextResponse.json({ error: "Homework not found" }, { status: 404 });
    }

    if (session.user.role !== "ADMIN" && homework.teacher.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await db.homework.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Homework deleted" });
  } catch (error) {
    console.error("DELETE /api/homework/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
