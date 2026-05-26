import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const item = await db.feeStructure.findUnique({
    where: { id },
    include: { class: true },
  });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(item);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOption);
  const { id } = await params;
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid payload" }, { status: 400 });

  const monthlyFee = toNum(body.monthlyFee);
  const totalMonths = body.totalMonths != null ? toNum(body.totalMonths) : 12;

  let total: number;
  if (monthlyFee > 0) {
    total = monthlyFee * totalMonths;
  } else {
    total = toNum(body.examFee) + toNum(body.transportFee) + toNum(body.miscFee);
  }

  const updated = await db.feeStructure.update({
    where: { id },
    data: {
      name: body.name ?? undefined,
      classId: body.classId ?? undefined,
      categoryId: body.categoryId || undefined,
      examFee:
        body.examFee != null ? new Prisma.Decimal(Number(body.examFee).toFixed(2)) : undefined,
      transportFee:
        body.transportFee != null ? new Prisma.Decimal(Number(body.transportFee).toFixed(2)) : undefined,
      miscFee:
        body.miscFee != null ? new Prisma.Decimal(Number(body.miscFee).toFixed(2)) : undefined,
      total: new Prisma.Decimal(total.toFixed(2)),
      monthlyFee: monthlyFee > 0 ? new Prisma.Decimal(monthlyFee.toFixed(2)) : null,
      totalMonths: monthlyFee > 0 ? totalMonths : 12,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await db.feeStructure.delete({ where: { id } });
  return NextResponse.json({ success: true }, { status: 204 });
}
