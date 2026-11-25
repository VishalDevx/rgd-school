import { NextResponse } from "next/server";
import { requireRole } from "@/app/lib/apiAuth";
import { db } from "@/lib/db";
import type { ExpenseRow as Expense } from "@/lib/types";

function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET() {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const now = new Date();

  // Last 6 months
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(ym(d));
  }

  // --- Fetch typed data ---
  const since = new Date(now.getFullYear(), now.getMonth() - 5, 1);
  const payments = await db.feeTransaction.findMany({
    where: { voided: false, paymentDate: { gte: since } },
    select: { amount: true, paymentDate: true },
  });

  const expenses = await db.expense.findMany({
    orderBy: { date: "asc" },
  });

  // --- Initialize month maps ---
  const feesByMonth: Record<string, number> = Object.fromEntries(
    months.map((m) => [m, 0])
  );

  const expByMonth: Record<string, number> = Object.fromEntries(
    months.map((m) => [m, 0])
  );

  // --- Process payments ---
  payments.forEach((p: { amount: number; paymentDate: Date }) => {
    const key = ym(new Date(p.paymentDate));
    if (key in feesByMonth) {
      feesByMonth[key] += Number(p.amount);
    }
  });

  // --- Process expenses ---
  expenses.forEach((e: Expense) => {
    const d = e.date ? new Date(e.date) : now;
    const key = ym(d);
    if (key in expByMonth) {
      expByMonth[key] += Number(e.amount);
    }
  });

  // --- Final response ---
  const data = {
    months,
    fees: months.map((m) => feesByMonth[m]),
    expenses: months.map((m) => expByMonth[m]),
  };

  return NextResponse.json(data);
}
