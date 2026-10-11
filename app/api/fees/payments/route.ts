import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";
import { money } from "@/lib/money";
import type { JsonInput } from "@/lib/types";

export async function GET() {
  const session = await getServerSession(authOption);
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await db.feePayment.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amountPaid: true,
      remainAmount: true,
      status: true,
      paymentDate: true,
      paymentMode: true,
      discount: true,
      lateFine: true,
      receiptNo: true,
      createdAt: true,
      student: {
        select: {
          id: true,
          admissionNo: true,
          rollNumber: true,
          user: { select: { name: true, email: true } },
          class: { select: { name: true } },
        },
      },
      feeStructure: { select: { id: true, name: true, total: true } },
    },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOption);
  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.studentId || !body.feeStructureId || body.amountPaid == null) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const fee = await db.feeStructure.findUnique({ where: { id: body.feeStructureId } });
  if (!fee) return NextResponse.json({ error: "Fee structure not found" }, { status: 404 });

  const student = await db.student.findUnique({ where: { id: body.studentId } });
  if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });

  // Adjust total for transport
  let adjustedTotal = Number(fee.total);
  if (fee.transportFee && !student.usesTransport) {
    adjustedTotal -= Number(fee.transportFee);
  }

  const newAmount = Number(body.amountPaid);
  const discount = body.discount != null ? Number(body.discount) : 0;
  const lateFine = body.lateFine != null ? Number(body.lateFine) : 0;
  const netAmount = newAmount + discount - lateFine;

  // Find existing payment for this student+structure
  const existing = await db.feePayment.findFirst({
    where: { studentId: body.studentId, feeStructureId: body.feeStructureId },
  });

  let result;

  if (existing) {
    // UPSERT: add to existing amountPaid
    const totalPaid = Number(existing.amountPaid) + newAmount;
    const remaining = Math.max(adjustedTotal - totalPaid, 0);
    let status: "PENDING" | "PARTIAL" | "PAID" = "PENDING";
    if (totalPaid >= adjustedTotal) status = "PAID";
    else if (totalPaid > 0) status = "PARTIAL";

    result = await db.feePayment.update({
      where: { id: existing.id },
      data: {
        amountPaid: money(totalPaid.toFixed(2)),
        remainAmount: money(remaining.toFixed(2)),
        status,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
        paymentMode: body.paymentMode ?? existing.paymentMode,
        discount: discount > 0 ? money(discount.toFixed(2)) : existing.discount,
        lateFine: lateFine > 0 ? money(lateFine.toFixed(2)) : existing.lateFine,
        receiptNo: body.receiptNo ?? existing.receiptNo,
        remarks: body.remarks ?? existing.remarks,
      },
    });
  } else {
    // CREATE new
    const remaining = Math.max(adjustedTotal - netAmount, 0);
    let status: "PENDING" | "PARTIAL" | "PAID" = "PENDING";
    if (netAmount >= adjustedTotal) status = "PAID";
    else if (netAmount > 0) status = "PARTIAL";

    // Generate receipt number
    let receiptNo = body.receiptNo ?? "";
    if (!receiptNo) {
      const school = await db.schoolSettings.findFirst({ orderBy: { createdAt: "desc" } });
      const prefix = school?.receiptPrefix ?? "RCP";
      const count = await db.feePayment.count();
      receiptNo = `${prefix}${String(count + 1).padStart(6, "0")}`;
    }

    result = await db.feePayment.create({
      data: {
        studentId: String(body.studentId),
        feeStructureId: String(body.feeStructureId),
        amountPaid: money(netAmount.toFixed(2)),
        remainAmount: money(remaining.toFixed(2)),
        status,
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : new Date(),
        paymentMode: body.paymentMode ?? null,
        discount: discount > 0 ? money(discount.toFixed(2)) : null,
        lateFine: lateFine > 0 ? money(lateFine.toFixed(2)) : null,
        receiptNo,
        remarks: body.remarks ?? null,
      },
    });
  }

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: existing ? "UPDATE_FEE_PAYMENT" : "CREATE_FEE_PAYMENT",
      entity: "FeePayment",
      entityId: result.id,
      newValue: {
        studentId: result.studentId,
        feeStructureId: result.feeStructureId,
        amountPaid: result.amountPaid,
        remainAmount: result.remainAmount,
        status: result.status,
        receiptNo: result.receiptNo,
      } as JsonInput,
    },
  });

  return NextResponse.json(result, { status: existing ? 200 : 201 });
}
