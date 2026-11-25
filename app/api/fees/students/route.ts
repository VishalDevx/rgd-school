import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/app/lib/apiAuth";
import { searchStudents } from "@/lib/fees/service";
import { feeErrorResponse } from "@/lib/fees/http";

/** Student search for the collect-fee picker. */
export async function GET(req: NextRequest) {
  const auth = await requireRole("ADMIN", "STAFF");
  if (!auth.ok) return auth.response;

  try {
    return NextResponse.json(await searchStudents(req.nextUrl.searchParams.get("q") ?? ""));
  } catch (err) {
    return feeErrorResponse(err, "search students");
  }
}
