import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/app/lib/apiAuth";
import { createAuditLog } from "@/app/lib/audit";
import { createStructure } from "@/lib/fees/service";
import { feeStructureInput, firstIssue } from "@/lib/fees/validation";
import { feeErrorResponse } from "@/lib/fees/http";

export async function GET(req: NextRequest) {
  const auth = await requireRole("ADMIN", "STAFF");
  if (!auth.ok) return auth.response;

  const classId = req.nextUrl.searchParams.get("classId");
  const items = await db.feeStructure.findMany({
    where: classId ? { classId } : undefined,
    include: { class: true, category: true, _count: { select: { payments: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const parsed = feeStructureInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });

  try {
    const result = await createStructure(parsed.data);
    await createAuditLog({
      userId: auth.session.user.id,
      action: "CREATE",
      entity: "FEE_STRUCTURE",
      entityId: result.id,
      newValue: { ...parsed.data, studentsBilled: result.studentsBilled },
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    return feeErrorResponse(err, "create structure");
  }
}
