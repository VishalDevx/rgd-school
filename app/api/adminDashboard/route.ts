import { NextResponse } from "next/server";
import { requireRole } from "@/app/lib/apiAuth";
import { db } from "@/lib/db";

export async function GET() {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const [totalStudents, totalStaff, totalClasses, totalExpenses] =
    await Promise.all([
      db.student.count(),
      db.staff.count(),
      db.class.count(),
      db.expense.aggregate({ _sum: { amount: true } }),
   
    ]);

  return NextResponse.json({
    stats: {
      totalStudents,
      totalStaff,
      totalClasses,
      totalExpenses: Number(totalExpenses._sum.amount || 0),
    },
   
  });
}
