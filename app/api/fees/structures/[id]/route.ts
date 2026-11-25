import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/app/lib/apiAuth";
import { createAuditLog } from "@/app/lib/audit";
import { deleteStructure, updateStructure } from "@/lib/fees/service";
import { feeStructureInput, firstIssue } from "@/lib/fees/validation";
import { feeErrorResponse } from "@/lib/fees/http";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const auth = await requireRole("ADMIN", "STAFF");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const item = await db.feeStructure.findUnique({ where: { id }, include: { class: true } }).catch(() => null);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const parsed = feeStructureInput.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: firstIssue(parsed.error) }, { status: 400 });

  try {
    const result = await updateStructure(id, parsed.data);
    await createAuditLog({
      userId: auth.session.user.id,
      action: "UPDATE",
      entity: "FEE_STRUCTURE",
      entityId: id,
      newValue: parsed.data,
    });
    return NextResponse.json(result);
  } catch (err) {
    return feeErrorResponse(err, "update structure");
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  try {
    await deleteStructure(id);
    await createAuditLog({ userId: auth.session.user.id, action: "DELETE", entity: "FEE_STRUCTURE", entityId: id });
    return NextResponse.json({ success: true });
  } catch (err) {
    return feeErrorResponse(err, "delete structure");
  }
}
