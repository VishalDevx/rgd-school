import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireRole } from "@/app/lib/apiAuth";
import { createAuditLog } from "@/app/lib/audit";
import { listDues, sendDueReminders } from "@/lib/fees/service";
import { feeErrorResponse } from "@/lib/fees/http";

/** Students with outstanding fees (defaulters list). */
export async function GET(req: NextRequest) {
  const auth = await requireRole("ADMIN", "STAFF");
  if (!auth.ok) return auth.response;

  const sp = req.nextUrl.searchParams;
  try {
    return NextResponse.json(
      await listDues({ classId: sp.get("classId"), q: sp.get("q"), overdueOnly: sp.get("overdue") === "true" })
    );
  } catch (err) {
    return feeErrorResponse(err, "list dues");
  }
}

const remindInput = z.object({ studentIds: z.array(z.string()).min(1).max(1000) });

/** Send in-app fee reminders to the selected students. */
export async function POST(req: NextRequest) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const parsed = remindInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Select at least one student" }, { status: 400 });

  try {
    const result = await sendDueReminders(parsed.data.studentIds);
    await createAuditLog({
      userId: auth.session.user.id,
      action: "SEND_FEE_REMINDERS",
      entity: "Notification",
      newValue: { requested: parsed.data.studentIds.length, sent: result.sent },
    });
    return NextResponse.json(result);
  } catch (err) {
    return feeErrorResponse(err, "send reminders");
  }
}
