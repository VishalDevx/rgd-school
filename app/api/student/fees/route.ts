import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/app/lib/apiAuth";
import { getStudentStatement } from "@/lib/fees/service";
import { feeErrorResponse } from "@/lib/fees/http";

/** The signed-in student's fee statement. */
export async function GET() {
  const auth = await requireRole("STUDENT");
  if (!auth.ok) return auth.response;

  const student = await db.student.findUnique({
    where: { userId: auth.session.user.id },
    select: { id: true, active: true },
  });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
  if (!student.active) {
    return NextResponse.json({ error: "Account deactivated. Contact admin." }, { status: 403 });
  }

  try {
    return NextResponse.json(await getStudentStatement(student.id));
  } catch (err) {
    return feeErrorResponse(err, "student fees");
  }
}
