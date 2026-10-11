import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const examId = searchParams.get("examId");
    const format = searchParams.get("format") ?? "json";

    if (!classId || !examId) {
      return new NextResponse("classId and examId are required", { status: 400 });
    }

    const classInfo = await db.class.findUnique({ where: { id: classId } });
    if (!classInfo) {
      return new NextResponse("Class not found", { status: 404 });
    }

    const exam = await db.exam.findUnique({ where: { id: examId } });
    if (!exam) {
      return new NextResponse("Exam not found", { status: 404 });
    }

    const students = await db.student.findMany({
      where: { classId, active: true },
      include: { user: { select: { name: true } } },
      orderBy: { rollNumber: "asc" },
    });

    const subjects = await db.subject.findMany({
      where: { classId },
      orderBy: { name: "asc" },
    });

    const results = await db.result.findMany({
      where: {
        examId,
        studentId: { in: students.map((s) => s.id) },
      },
    });

    const resultMap = new Map<string, { marks: number; maxMarks: number; grade: string | null }>();
    for (const r of results) {
      resultMap.set(`${r.studentId}_${r.subjectId}`, {
        marks: r.marks,
        maxMarks: r.maxMarks,
        grade: r.grade,
      });
    }

    const rows = students.map((student) => {
      const subjectMarks = subjects.map((subject) => {
        const res = resultMap.get(`${student.id}_${subject.id}`);
        return {
          subjectName: subject.name,
          marks: res?.marks ?? null,
          maxMarks: res?.maxMarks ?? null,
          grade: res?.grade ?? null,
        };
      });

      const totalMarks = subjectMarks.reduce((s, m) => s + (m.marks ?? 0), 0);
      const totalMaxMarks = subjectMarks.reduce((s, m) => s + (m.maxMarks ?? 0), 0);
      const percentage = totalMaxMarks > 0 ? Number(((totalMarks / totalMaxMarks) * 100).toFixed(2)) : 0;

      let division = "FAIL";
      if (percentage >= 60) division = "FIRST";
      else if (percentage >= 45) division = "SECOND";
      else if (percentage >= 33) division = "THIRD";

      return {
        rollNumber: student.rollNumber,
        studentName: student.user.name,
        admissionNo: student.admissionNo,
        subjectMarks,
        totalMarks,
        totalMaxMarks,
        percentage,
        division,
      };
    });

    if (format === "csv") {
      const header = ["Roll No", "Student Name", "Admission No"];
      for (const s of subjects) {
        header.push(`${s.name} Marks`, `${s.name} Max`, `${s.name} Grade`);
      }
      header.push("Total Marks", "Total Max", "Percentage", "Division");

      const csvRows = [header.join(",")];
      for (const row of rows) {
        const cols = [row.rollNumber, row.studentName, row.admissionNo];
        for (const sm of row.subjectMarks) {
          cols.push(String(sm.marks ?? ""), String(sm.maxMarks ?? ""), sm.grade ?? "");
        }
        cols.push(
          String(row.totalMarks),
          String(row.totalMaxMarks),
          String(row.percentage),
          row.division
        );
        csvRows.push(cols.join(","));
      }

      const csv = csvRows.join("\n");
      const filename = `${exam.name.replace(/\s+/g, "_")}_${classInfo.name.replace(/\s+/g, "_")}.csv`;

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({
      className: classInfo.name,
      examName: exam.name,
      examCategory: exam.category,
      subjects: subjects.map((s) => ({ id: s.id, name: s.name })),
      results: rows,
    });
  } catch (error) {
    console.error("RESULT_EXPORT_ERROR:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
