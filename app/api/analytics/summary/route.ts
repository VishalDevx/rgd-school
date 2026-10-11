import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { FeePaymentRow as FeePayment, ExpenseRow as Expense } from "@/lib/types";

function ym(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function GET() {
  const now = new Date();

  // Last 6 months
  const months: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(ym(d));
  }

  // --- Fetch typed data ---
  const payments = await db.feePayment.findMany({
    include: { student: true },
    orderBy: { createdAt: "asc" },
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
  payments.forEach((p: FeePayment) => {
    const d = p.createdAt ? new Date(p.createdAt) : now;
    const key = ym(d);
    if (key in feesByMonth) {
      feesByMonth[key] += Number(p.amountPaid);
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
