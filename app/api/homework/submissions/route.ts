import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const student = await db.student.findUnique({
      where: { userId: session.user.id },
    });
    if (!student) {
      return NextResponse.json({ error: "Student record not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.homeworkId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const homework = await db.homework.findUnique({
      where: { id: body.homeworkId },
    });
    if (!homework) {
      return NextResponse.json({ error: "Homework not found" }, { status: 404 });
    }

    const date = new Date();
    const submission = await db.homeworkSubmission.upsert({
      where: {
        homeworkId_studentId: {
          homeworkId: body.homeworkId,
          studentId: student.id,
        },
      },
      update: {
        answerFile: body.answerFile || null,
        remarks: body.remarks || null,
        status: "SUBMITTED",
        submittedAt: date,
      },
      create: {
        homeworkId: body.homeworkId,
        studentId: student.id,
        answerFile: body.answerFile || null,
        remarks: body.remarks || null,
        status: "SUBMITTED",
        submittedAt: date,
      },
    });

    return NextResponse.json({ success: true, data: submission }, { status: 201 });
  } catch (error) {
    console.error("POST /api/homework/submissions error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const homeworkId = searchParams.get("homeworkId");

    const where: Record<string, unknown> = {};
    if (homeworkId) where.homeworkId = homeworkId;

    const submissions = await db.homeworkSubmission.findMany({
      where,
      include: {
        student: {
          include: { user: { select: { name: true, email: true } } },
        },
        homework: {
          include: {
            class: { select: { name: true } },
            subject: { select: { name: true } },
          },
        },
      },
      orderBy: { submittedAt: "desc" },
    });

    return NextResponse.json({ success: true, data: submissions });
  } catch (error) {
    console.error("GET /api/homework/submissions error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
