import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function GET(req: Request) {
  try {
    // -------------------- AUTH --------------------
    const session = await getServerSession(authOption);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // -------------------- PARAMS --------------------
    const { searchParams } = new URL(req.url);
    const studentIdParam = searchParams.get("studentId");

    let studentId = studentIdParam ?? "";

    if (session.user.role === "STUDENT") {
      const student = await db.student.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!student) return new NextResponse("Student not found", { status: 404 });

      // Students may only access their own marksheet.
      if (studentIdParam && studentIdParam !== student.id) {
        return new NextResponse("Forbidden", { status: 403 });
      }

      studentId = student.id;
    } else if (["ADMIN", "STAFF"].includes(session.user.role)) {
      if (!studentIdParam) {
        return new NextResponse("studentId is required", { status: 400 });
      }
      studentId = studentIdParam;
    } else {
      return new NextResponse("Forbidden", { status: 403 });
    }

    // -------------------- STUDENT --------------------
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: {
        user: true,
        class: {
          include: {
            academicSession: true, // include session relation
          },
        },
      },
    });

    if (!student || !student.classId) {
      return new NextResponse("Student not found", { status: 404 });
    }

    const classId = student.classId;

    // -------------------- SUBJECTS --------------------
    const subjects = await db.subject.findMany({
      where: { classId },
      orderBy: { name: "asc" },
    });

    // -------------------- EXAMS --------------------
    const exams = await db.exam.findMany({
      where: { classId },
      orderBy: [
        { category: "asc" }, // UNIT_TEST → HALF_YEARLY → ANNUAL
        { sequence: "asc" }, // UT-1, UT-2
      ],
    });

    // -------------------- RESULTS --------------------
    const results = await db.result.findMany({
      where: {
        studentId,
        examId: { in: exams.map((e) => e.id) },
      },
    });

    // -------------------- RESULT LOOKUP --------------------
    const resultMap = new Map<string, typeof results[number]>();
    for (const r of results) {
      resultMap.set(`${r.subjectId}_${r.examId}`, r);
    }

    // -------------------- BUILD SUBJECT ROWS --------------------
    let grandTotalMarks = 0;
    let grandTotalMaxMarks = 0;

    const subjectRows = subjects.map((subject) => {
      let subjectTotalMarks = 0;
      let subjectTotalMaxMarks = 0;

      const examMarks = exams.map((exam) => {
        const key = `${subject.id}_${exam.id}`;
        const result = resultMap.get(key) ?? null;

        if (result) {
          subjectTotalMarks += result.marks;
          subjectTotalMaxMarks += result.maxMarks;
        }

        return {
          examId: exam.id,
          category: exam.category,
          sequence: exam.sequence,
          marks: result ? result.marks : null,
          maxMarks: result ? result.maxMarks : null,
          grade: result?.grade ?? null,
        };
      });

      grandTotalMarks += subjectTotalMarks;
      grandTotalMaxMarks += subjectTotalMaxMarks;

      return {
        subjectId: subject.id,
        subjectName: subject.name,
        exams: examMarks,
        totalMarks: subjectTotalMarks,
        totalMaxMarks: subjectTotalMaxMarks,
      };
    });

    // -------------------- PERCENTAGE --------------------
    const percentage =
      grandTotalMaxMarks > 0
        ? Number(((grandTotalMarks / grandTotalMaxMarks) * 100).toFixed(2))
        : 0;

    // -------------------- DIVISION --------------------
    let division: "FIRST" | "SECOND" | "THIRD" | "FAIL";
    if (percentage >= 60) division = "FIRST";
    else if (percentage >= 45) division = "SECOND";
    else if (percentage >= 33) division = "THIRD";
    else division = "FAIL";

    // -------------------- FINAL RESPONSE --------------------
    return NextResponse.json({
      student: {
        id: student.id,
        name: student.user.name,
        rollNumber: student.rollNumber,
        class: {
          name: student.class?.name ?? "",
          academicSession: student.class?.academicSession?.name ?? "",
        },
      },

      exams: exams.map((e) => ({
        id: e.id,
        name: e.name,
        category: e.category,
        sequence: e.sequence,
      })),

      subjects: subjectRows,

      summary: {
        totalMarks: grandTotalMarks,
        totalMaxMarks: grandTotalMaxMarks,
        percentage,
        division,
      },
    });
  } catch (error) {
    console.error("MARKSHEET_ERROR:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
