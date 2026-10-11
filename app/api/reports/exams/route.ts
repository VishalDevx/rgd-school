import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "class-result";
    const examId = searchParams.get("examId");
    const classId = searchParams.get("classId");
    const subjectId = searchParams.get("subjectId");
    const limit = searchParams.get("limit") ? Number(searchParams.get("limit")) : undefined;

    if (!examId) {
      return NextResponse.json({ error: "examId is required" }, { status: 400 });
    }

    const exam = await db.exam.findUnique({
      where: { id: examId },
      include: { class: { select: { name: true } } },
    });
    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    const studentWhere = classId ? { classId } : { classId: exam.classId };
    if (!classId) studentWhere.classId = exam.classId;

    const students = await db.student.findMany({
      where: { ...studentWhere, active: true },
      include: { user: { select: { name: true } } },
      orderBy: { rollNumber: "asc" },
    });

    const subjectWhere: Record<string, unknown> = {};
    if (subjectId) subjectWhere.id = subjectId;
    else subjectWhere.classId = classId ?? exam.classId;

    const subjects = await db.subject.findMany({ where: subjectWhere, orderBy: { name: "asc" } });

    const results = await db.result.findMany({
      where: { examId, studentId: { in: students.map((s) => s.id) } },
    });

    const resultMap = new Map<string, { marks: number; maxMarks: number; grade: string | null }>();
    for (const r of results) {
      resultMap.set(`${r.studentId}_${r.subjectId}`, {
        marks: r.marks,
        maxMarks: r.maxMarks,
        grade: r.grade,
      });
    }

    switch (type) {
      case "class-result": {
        const rows = students.map((student) => {
          const subjectMarks = subjects.map((sub) => {
            const res = resultMap.get(`${student.id}_${sub.id}`);
            return {
              subjectName: sub.name,
              marks: res?.marks ?? null,
              maxMarks: res?.maxMarks ?? null,
              grade: res?.grade ?? null,
            };
          });
          const totalMarks = subjectMarks.reduce((s, m) => s + (m.marks ?? 0), 0);
          const totalMaxMarks = subjectMarks.reduce((s, m) => s + (m.maxMarks ?? 0), 0);
          const percentage = totalMaxMarks > 0 ? Number(((totalMarks / totalMaxMarks) * 100).toFixed(2)) : 0;
          return {
            rollNumber: student.rollNumber,
            studentName: student.user.name,
            admissionNo: student.admissionNo,
            subjectMarks,
            totalMarks,
            totalMaxMarks,
            percentage,
          };
        });

        rows.sort((a, b) => b.percentage - a.percentage);
        rows.forEach((r, i) => { (r as { rank?: number }).rank = i + 1; });

        return NextResponse.json({
          examName: exam.name,
          className: exam.class.name,
          subjects: subjects.map((s) => ({ id: s.id, name: s.name })),
          results: rows,
        });
      }

      case "subject-result": {
        if (!subjectId) {
          return NextResponse.json({ error: "subjectId required for subject-result" }, { status: 400 });
        }
        const subject = subjects[0];
        if (!subject) {
          return NextResponse.json({ error: "Subject not found" }, { status: 404 });
        }

        const rows = students
          .map((student) => {
            const res = resultMap.get(`${student.id}_${subject.id}`);
            return {
              rollNumber: student.rollNumber,
              studentName: student.user.name,
              marks: res?.marks ?? null,
              maxMarks: res?.maxMarks ?? null,
              grade: res?.grade ?? null,
            };
          })
          .filter((r) => r.marks !== null);

        rows.sort((a, b) => (b.marks ?? 0) - (a.marks ?? 0));
        rows.forEach((r, i) => { (r as { rank?: number }).rank = i + 1; });

        return NextResponse.json({
          examName: exam.name,
          className: exam.class.name,
          subjectName: subject.name,
          results: rows,
        });
      }

      case "toppers": {
        const rows = students.map((student) => {
          const subjectMarks = subjects.map((sub) => {
            const res = resultMap.get(`${student.id}_${sub.id}`);
            return res?.marks ?? 0;
          });
          const totalMarks = subjectMarks.reduce((s, m) => s + m, 0);
          const totalMaxMarks = subjects.reduce((s, sub) => {
            const res = resultMap.get(`${student.id}_${sub.id}`);
            return s + (res?.maxMarks ?? 0);
          }, 0);
          const percentage = totalMaxMarks > 0 ? Number(((totalMarks / totalMaxMarks) * 100).toFixed(2)) : 0;
          return {
            rollNumber: student.rollNumber,
            studentName: student.user.name,
            totalMarks,
            totalMaxMarks,
            percentage,
          };
        });

        rows.sort((a, b) => b.percentage - a.percentage);
        const topN = limit ?? 10;
        const ranked = rows.slice(0, topN).map((r, i) => ({ ...r, rank: i + 1 }));

        return NextResponse.json({
          examName: exam.name,
          className: exam.class.name,
          limit: topN,
          results: ranked,
        });
      }

      case "failed": {
        const rows = students
          .map((student) => {
            const subjectMarks = subjects.map((sub) => {
              const res = resultMap.get(`${student.id}_${sub.id}`);
              return {
                subjectName: sub.name,
                marks: res?.marks ?? null,
                passingMarks: sub.passingMarks ?? 0,
              };
            });
            const failedSubjects = subjectMarks.filter(
              (sm) => sm.marks !== null && sm.marks < (sm.passingMarks ?? 0)
            );
            return {
              rollNumber: student.rollNumber,
              studentName: student.user.name,
              totalFailed: failedSubjects.length,
              failedSubjects,
            };
          })
          .filter((r) => r.totalFailed > 0);

        return NextResponse.json({
          examName: exam.name,
          className: exam.class.name,
          results: rows,
        });
      }

      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
