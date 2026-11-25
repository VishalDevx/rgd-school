import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/app/lib/apiAuth";
import { createAuditLog } from "@/app/lib/audit";
import { voidTransaction } from "@/lib/fees/service";
import { firstIssue, voidInput } from "@/lib/fees/validation";
import { feeErrorResponse } from "@/lib/fees/http";

/** Cancel a receipt (admin only). The receipt stays on record, marked VOID. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ paymentId: string }> }) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const parsed = voidInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });

  const { paymentId } = await params;
  try {
    const result = await voidTransaction(paymentId, parsed.data.reason, auth.session.user.id);
    await createAuditLog({
      userId: auth.session.user.id,
      action: "VOID_FEE_PAYMENT",
      entity: "FeeTransaction",
      entityId: paymentId,
      newValue: { receiptNo: result.receiptNo, amount: result.amount, reason: parsed.data.reason },
    });
    return NextResponse.json(result);
  } catch (err) {
    return feeErrorResponse(err, "void payment");
  }
}
