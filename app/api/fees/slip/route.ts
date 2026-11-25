import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/app/lib/apiAuth";
import { getStudentStatement } from "@/lib/fees/service";
import { feeErrorResponse } from "@/lib/fees/http";

/** Consolidated fee statement. Students always get their own. */
export async function GET(req: NextRequest) {
  const auth = await requireRole();
  if (!auth.ok) return auth.response;

  let studentId = req.nextUrl.searchParams.get("studentId") ?? "";
  if (auth.session.user.role === "STUDENT") {
    const self = await db.student.findUnique({ where: { userId: auth.session.user.id }, select: { id: true } });
    if (!self) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    studentId = self.id;
  } else if (!studentId) {
    return NextResponse.json({ error: "studentId is required" }, { status: 400 });
  }

  try {
    return NextResponse.json(await getStudentStatement(studentId));
  } catch (err) {
    return feeErrorResponse(err, "fee statement");
  }
}
