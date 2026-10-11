import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get student record
    const student = await db.student.findUnique({
      where: { userId: session.user.id },
      include: {
        class: {
          include: {
            subjects: {
              include: {
                teacher: {
                  include: { user: true },
                },
              },
            },
          },
        },
      },
    });

    if (!student || !student.classId) {
      return NextResponse.json({ error: "Student or class not found" }, { status: 404 });
    }

    if (!student.active) {
      return NextResponse.json({ error: "Account deactivated. Contact admin." }, { status: 403 });
    }

    // Get all exams for student's class
    const exams = await db.exam.findMany({
      where: { classId: student.classId },
      include: {
        class: true,
        dateSheet: {
          include: {
            subject: true,
          },
          orderBy: { examDate: "asc" },
        },
      },
      orderBy: { startDate: "asc" },
    });

    // Get upcoming exams
    const now = new Date();
    const upcomingExams = exams.filter((exam) => new Date(exam.startDate) >= now);

    // Get past exams
    const pastExams = exams.filter((exam) => new Date(exam.endDate) < now);

    // Get current/ongoing exams
    const currentExams = exams.filter(
      (exam) =>
        new Date(exam.startDate) <= now && new Date(exam.endDate) >= now
    );

    return NextResponse.json({
      exams,
      upcomingExams,
      pastExams,
      currentExams,
      student: {
        id: student.id,
        admissionNo: student.admissionNo,
        rollNumber: student.rollNumber,
        class: student.class
          ? {
              id: student.class.id,
              name: student.class.name,
              grade: student.class.grade,
              section: student.class.section,
              subjects: student.class.subjects,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Error fetching student timetable:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
