import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authOption } from "@/app/lib/auth";
import ExpenseDashboardClient from "./ExpenseDashboard";

export const dynamic = "force-dynamic";

export default async function AdminExpensesPage() {
  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const raw = await db.expense.findMany();

  const expenses = raw.map((x) => ({
    id: x.id,
    title: x.title,
    description: x.description ?? "",
    amount: Number(x.amount),
    date: x.date.toISOString(),
    transactionType: x.transaction, 
  }));

  return <ExpenseDashboardClient expenses={expenses} />;
}
