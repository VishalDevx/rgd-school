import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/app/lib/apiAuth";
import { getStudentAccounts } from "@/lib/fees/service";
import { feeErrorResponse } from "@/lib/fees/http";

/** A student's fee accounts with live balances (collect-fee form). */
export async function GET(req: NextRequest) {
  const auth = await requireRole("ADMIN", "STAFF");
  if (!auth.ok) return auth.response;

  const studentId = req.nextUrl.searchParams.get("studentId");
  if (!studentId) return NextResponse.json({ error: "studentId is required" }, { status: 400 });

  try {
    return NextResponse.json(await getStudentAccounts(studentId));
  } catch (err) {
    return feeErrorResponse(err, "get accounts");
  }
}
