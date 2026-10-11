import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const groupBy = searchParams.get("groupBy") ?? "daily";

    const dateFilter: { gte?: Date; lte?: Date } = {};
    if (fromDate) dateFilter.gte = new Date(fromDate);
    if (toDate) dateFilter.lte = new Date(toDate);

    const incomeFilter = Object.keys(dateFilter).length > 0 ? { date: dateFilter } : {};

    const [income, expenses] = await Promise.all([
      db.feePayment.findMany({
        where: {
          paymentDate: dateFilter.gte || dateFilter.lte ? dateFilter : undefined,
        },
        orderBy: { paymentDate: "asc" },
      }),
      db.expense.findMany({
        where: {
          date: dateFilter.gte || dateFilter.lte ? dateFilter : undefined,
          transaction: "DEBIT",
        },
        orderBy: { date: "asc" },
      }),
    ]);

    const periodMap = new Map<string, { income: number; expense: number }>();

    function addToMap(date: Date, amount: number, type: "income" | "expense") {
      const key = groupBy === "monthly"
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
        : date.toISOString().slice(0, 10);

      if (!periodMap.has(key)) periodMap.set(key, { income: 0, expense: 0 });
      const entry = periodMap.get(key)!;
      if (type === "income") entry.income += amount;
      else entry.expense += amount;
    }

    for (const p of income) {
      addToMap(p.paymentDate ?? p.createdAt, Number(p.amountPaid), "income");
    }
    for (const e of expenses) {
      addToMap(e.date, Number(e.amount), "expense");
    }

    const periods = Array.from(periodMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([period, data]) => ({
        period,
        income: data.income,
        expense: data.expense,
        net: data.income - data.expense,
      }));

    const totalIncome = periods.reduce((s, p) => s + p.income, 0);
    const totalExpense = periods.reduce((s, p) => s + p.expense, 0);

    return NextResponse.json({
      periods,
      summary: { totalIncome, totalExpense, net: totalIncome - totalExpense },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
