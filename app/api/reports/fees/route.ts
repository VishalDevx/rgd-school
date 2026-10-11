import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";
import type { WhereInput } from "@/lib/types";

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
    const classId = searchParams.get("classId");
    const groupBy = searchParams.get("groupBy") ?? "daily";

    const where: WhereInput = {};
    if (fromDate || toDate) {
      where.paymentDate = {};
      if (fromDate) where.paymentDate.gte = new Date(fromDate);
      if (toDate) where.paymentDate.lte = new Date(toDate);
    }
    if (classId) {
      where.student = { classId };
    }

    const payments = await db.feePayment.findMany({
      where,
      include: {
        feeStructure: true,
        student: { include: { class: true } },
      },
      orderBy: { paymentDate: "asc" },
    });

    const grouped = new Map<string, {
      totalCollected: number;
      totalPending: number;
      paymentCount: number;
      classes: Map<string, { totalCollected: number; paymentCount: number }>;
    }>();

    for (const p of payments) {
      const d = p.paymentDate ?? p.createdAt;
      const key = groupBy === "monthly"
        ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        : d.toISOString().slice(0, 10);

      if (!grouped.has(key)) {
        grouped.set(key, { totalCollected: 0, totalPending: 0, paymentCount: 0, classes: new Map() });
      }
      const g = grouped.get(key)!;
      g.totalCollected += Number(p.amountPaid);
      g.totalPending += Number(p.remainAmount);
      g.paymentCount += 1;

      const className = p.student.class?.name ?? "Unknown";
      if (!g.classes.has(className)) {
        g.classes.set(className, { totalCollected: 0, paymentCount: 0 });
      }
      const c = g.classes.get(className)!;
      c.totalCollected += Number(p.amountPaid);
      c.paymentCount += 1;
    }

    const result = Array.from(grouped.entries()).map(([period, g]) => ({
      period,
      totalCollected: g.totalCollected,
      totalPending: g.totalPending,
      paymentCount: g.paymentCount,
      classBreakdown: Array.from(g.classes.entries()).map(([name, data]) => ({
        className: name,
        totalCollected: data.totalCollected,
        paymentCount: data.paymentCount,
      })),
    }));

    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
