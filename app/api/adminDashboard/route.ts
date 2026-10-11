import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
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
