import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/app/lib/apiAuth";
import { resetAllStudentPasswords } from "@/app/lib/studentPassword";

export async function POST(req: NextRequest) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  try {
    const body = await req.json();
    const newPassword = body?.password || "Student@123"; // default if not passed
    const result = await resetAllStudentPasswords(newPassword);

    return NextResponse.json({ success: true, updatedCount: result.message });
  } catch (err) {
    console.error("Bulk student password reset failed:", err);
    return NextResponse.json({ error: "Failed to reset passwords" }, { status: 500 });
  }
}
