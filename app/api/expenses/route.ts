import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { TransactionType, PaymentMethod } from "@/lib/enums";
import { authOption } from "@/app/lib/auth";
import type { JsonInput } from "@/lib/types";

interface CreateExpenseBody {
  title: string;
  description?: string | null;
  amount: number | string;
  date?: string | null;
  transaction: TransactionType;
  categoryId?: string | null;
  paidTo?: string | null;
  paymentMode?: PaymentMethod | null;
  billUrl?: string | null;
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const categoryId = searchParams.get("categoryId");

  const where: Record<string, unknown> = {};
  if (categoryId) {
    where.categoryId = categoryId;
  }

  const expenses = await db.expense.findMany({
    where,
    include: { category: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(expenses);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOption);

  if (!session?.user || session.user.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body: CreateExpenseBody | null = await req.json().catch(() => null);
  if (!body) {
    return new NextResponse("Invalid payload", { status: 400 });
  }

  const { title, amount, transaction, description, date, categoryId, paidTo, paymentMode, billUrl } = body;

  if (!title || amount == null || !transaction) {
    return new NextResponse("Title, amount, and transaction are required", { status: 400 });
  }

  if (!Object.values(TransactionType).includes(transaction)) {
    return new NextResponse("Invalid transaction type", { status: 400 });
  }

  if (paymentMode && !Object.values(PaymentMethod).includes(paymentMode)) {
    return new NextResponse("Invalid payment mode", { status: 400 });
  }

  const normalizedAmount = Number(amount);
  if (Number.isNaN(normalizedAmount)) {
    return new NextResponse("Invalid amount", { status: 400 });
  }

  const created = await db.expense.create({
    data: {
      title,
      description: description ?? null,
      amount: normalizedAmount.toFixed(2),
      transaction,
      date: date ? new Date(date) : new Date(),
      createdById: session.user.id,
      categoryId: categoryId ?? null,
      paidTo: paidTo ?? null,
      paymentMode: paymentMode ?? null,
      billUrl: billUrl ?? null,
    },
  });

  await db.auditLog.create({
    data: {
      userId: session.user.id,
      action: "CREATE_EXPENSE",
      entity: "Expense",
      entityId: created.id,
      newValue: {
        title: created.title,
        amount: created.amount,
        transaction: created.transaction,
        categoryId: created.categoryId,
        paidTo: created.paidTo,
        paymentMode: created.paymentMode,
      } as JsonInput,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
