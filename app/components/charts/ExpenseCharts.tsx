"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { Button } from "../ui/button";
import { Eye, PlusCircle, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import DeleteDialog from "../DeleteDialog";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { TransactionType } from "@/lib/enums";

export type Expense = {
  id: string;
  title: string;
  description: string;
  amount: number;
  date: string; // ISO
  transactionType: TransactionType;
};

const COLORS = ["#6366f1", "#ef4444", "#10b981", "#f59e0b", "#3b82f6"];

export default function ExpenseDashboard({ expenses }: { expenses: Expense[] }) {
  const router = useRouter();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/expenses/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Expense deleted");
      setDeleteId(null);
      router.refresh();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  // ----------- BASIC STATS ---------------
  const totalExpense = expenses
    .filter((x) => x.transactionType === TransactionType.DEBIT)
    .reduce((sum, x) => sum + Number(x.amount), 0);

  const totalIncome = expenses
    .filter((x) => x.transactionType === TransactionType.CREDIT)
    .reduce((sum, x) => sum + Number(x.amount), 0);

  const today = new Date().toDateString();
  const todayAmount = expenses
    .filter((x) => new Date(x.date).toDateString() === today)
    .reduce((s, x) => s + Number(x.amount), 0);

  // ----------- MONTHLY CHART DATA ---------------
  const monthly = expenses.reduce((acc, exp) => {
    const month = format(new Date(exp.date), "MMM");
    acc[month] = (acc[month] || 0) + Number(exp.amount);
    return acc;
  }, {} as Record<string, number>);

  const monthlyData = Object.keys(monthly).map((m) => ({
    month: m,
    amount: monthly[m],
  }));

  // ----------- PIE DATA ---------------
  const categoryData = expenses.reduce((acc, exp) => {
    const cat = exp.title;
    acc[cat] = (acc[cat] || 0) + Number(exp.amount);
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(categoryData).map((key) => ({
    name: key,
    value: categoryData[key],
  }));

  return (
    <div className="space-y-10">

      {/* ---------- TOP BAR ---------- */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Expense Dashboard</h2>
        <Link href="/admin/expenses/new">
          <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-md hover:opacity-90">
            <PlusCircle className="w-4 h-4" />
            Add Expense
          </button>
        </Link>
      </div>

      {/* ---------- SUMMARY CARDS ---------- */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Total Income</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">₹{totalIncome}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">₹{totalExpense}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today’s Spending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">₹{todayAmount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Total Records</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{expenses.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* ---------- CHARTS ---------- */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* LINE CHART */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Expense Trend</CardTitle>
          </CardHeader>
          <CardContent className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={3} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* PIE CHART */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="h-72 flex justify-center items-center">
            <ResponsiveContainer width="90%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  innerRadius={40}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* ---------- TABLE ---------- */}
      <Card>
        <CardHeader>
          <CardTitle>All Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="table-auto w-full border-collapse">
              <thead>
                <tr className="bg-secondary text-left text-sm">
                  <th className="px-4 py-2 border">Title</th>
                  <th className="px-4 py-2 border">Amount</th>
                  <th className="px-4 py-2 border">Type</th>
                  <th className="px-4 py-2 border">Date</th>
                  <th className="px-4 py-2 border">Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id} className="border">
                    <td className="px-4 py-2">{expense.title}</td>
                    <td className="px-4 py-2">₹{Number(expense.amount)}</td>
                    <td className="px-4 py-2">
                      {expense.transactionType === TransactionType.CREDIT ? (
                        <span className="text-green-600 font-semibold">Income</span>
                      ) : (
                        <span className="text-red-600 font-semibold">Expense</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {format(new Date(expense.date), "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/expenses/${expense.id}`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/admin/expenses/${expense.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => setDeleteId(expense.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <DeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Expense"
      />
    </div>
  );
}
