import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/app/lib/apiAuth";
import { createAuditLog } from "@/app/lib/audit";
import { listTransactions, recordPayment } from "@/lib/fees/service";
import { firstIssue, paymentInput } from "@/lib/fees/validation";
import { feeErrorResponse } from "@/lib/fees/http";

/** Receipts (fee transactions), newest first, filtered and paginated. */
export async function GET(req: NextRequest) {
  const auth = await requireRole("ADMIN", "STAFF");
  if (!auth.ok) return auth.response;

  const sp = req.nextUrl.searchParams;
  const date = (k: string) => {
    const v = sp.get(k);
    const d = v ? new Date(v) : null;
    return d && !Number.isNaN(d.getTime()) ? d : null;
  };

  try {
    const data = await listTransactions({
      page: Number(sp.get("page")) || 1,
      pageSize: Number(sp.get("pageSize")) || 20,
      q: sp.get("q"),
      classId: sp.get("classId"),
      mode: sp.get("mode"),
      from: date("from"),
      to: date("to"),
      includeVoided: sp.get("includeVoided") === "true",
    });
    return NextResponse.json(data);
  } catch (err) {
    return feeErrorResponse(err, "list payments");
  }
}

/** Collect a fee: writes one receipt and updates the student's balance. */
export async function POST(req: NextRequest) {
  const auth = await requireRole("ADMIN", "STAFF");
  if (!auth.ok) return auth.response;

  const parsed = paymentInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });

  try {
    const result = await recordPayment(parsed.data, auth.session.user.id);
    await createAuditLog({
      userId: auth.session.user.id,
      action: "CREATE_FEE_PAYMENT",
      entity: "FeeTransaction",
      entityId: result.id,
      newValue: {
        receiptNo: result.receiptNo,
        studentId: parsed.data.studentId,
        feeStructureId: parsed.data.feeStructureId,
        amount: parsed.data.amount,
        discount: parsed.data.discount,
        lateFine: parsed.data.lateFine,
        paymentMode: parsed.data.paymentMode,
        remaining: result.balance.remainAmount,
      },
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return feeErrorResponse(err, "record payment");
  }
}
