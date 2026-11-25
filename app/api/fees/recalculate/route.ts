import { NextResponse } from "next/server";
import { requireRole } from "@/app/lib/apiAuth";
import { createAuditLog } from "@/app/lib/audit";
import { recalculateAll } from "@/lib/fees/service";
import { feeErrorResponse } from "@/lib/fees/http";

export const maxDuration = 60;

/** Rebuild every fee balance from receipts (same as `npm run fees:migrate`). */
export async function POST() {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  try {
    const result = await recalculateAll();
    await createAuditLog({
      userId: auth.session.user.id,
      action: "RECALCULATE_FEES",
      entity: "FeePayment",
      newValue: result,
    });
    return NextResponse.json(result);
  } catch (err) {
    return feeErrorResponse(err, "recalculate");
  }
}
