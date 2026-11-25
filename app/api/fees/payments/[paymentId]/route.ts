import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/app/lib/apiAuth";
import { getReceipt } from "@/lib/fees/service";
import { feeErrorResponse } from "@/lib/fees/http";

/** One printable receipt. Students may only open their own. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  const auth = await requireRole();
  if (!auth.ok) return auth.response;

  const { paymentId } = await params;
  try {
    const receipt = await getReceipt(paymentId);
    if (auth.session.user.role === "STUDENT" && receipt.student.userId !== auth.session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    return NextResponse.json(receipt);
  } catch (err) {
    return feeErrorResponse(err, "get receipt");
  }
}
