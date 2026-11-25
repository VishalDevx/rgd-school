import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireRole } from "@/app/lib/apiAuth";
import { money } from "@/lib/money";
import type { WhereInput } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Fee collection grouped by day or month, built from receipts.
 *
 * The old version grouped fee *accounts* by their last payment date, so an
 * account paid in three instalments counted its whole total on the last day.
 */
export async function GET(req: NextRequest) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;

  try {
    const sp = req.nextUrl.searchParams;
    const fromDate = sp.get("fromDate");
    const toDate = sp.get("toDate");
    const classId = sp.get("classId");
    const groupBy = sp.get("groupBy") === "monthly" ? "monthly" : "daily";

    const where: WhereInput = { voided: false };
    if (fromDate || toDate) {
      where.paymentDate = {};
      if (fromDate) where.paymentDate.gte = new Date(fromDate);
      if (toDate) {
        const end = new Date(toDate);
        end.setHours(23, 59, 59, 999);
        where.paymentDate.lte = end;
      }
    }
    if (classId) {
      const structures = await db.feeStructure.findMany({ where: { classId }, select: { id: true } });
      where.feeStructureId = { in: structures.map((s) => s.id) };
    }

    const receipts = await db.feeTransaction.findMany({
      where,
      include: { feeStructure: { include: { class: true } } },
      orderBy: { paymentDate: "asc" },
    });

    const grouped = new Map<
      string,
      { totalCollected: number; totalDiscount: number; paymentCount: number; classes: Map<string, { totalCollected: number; paymentCount: number }> }
    >();

    for (const r of receipts) {
      const d = new Date(r.paymentDate);
      const key =
        groupBy === "monthly"
          ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
          : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      const g = grouped.get(key) ?? { totalCollected: 0, totalDiscount: 0, paymentCount: 0, classes: new Map() };
      g.totalCollected = money(g.totalCollected + Number(r.amount));
      g.totalDiscount = money(g.totalDiscount + Number(r.discount ?? 0));
      g.paymentCount += 1;

      const className = r.feeStructure?.class?.name ?? "Unknown";
      const c = g.classes.get(className) ?? { totalCollected: 0, paymentCount: 0 };
      c.totalCollected = money(c.totalCollected + Number(r.amount));
      c.paymentCount += 1;
      g.classes.set(className, c);
      grouped.set(key, g);
    }

    return NextResponse.json(
      [...grouped.entries()].map(([period, g]) => ({
        period,
        totalCollected: g.totalCollected,
        totalDiscount: g.totalDiscount,
        paymentCount: g.paymentCount,
        classBreakdown: [...g.classes.entries()].map(([className, data]) => ({ className, ...data })),
      }))
    );
  } catch (err: unknown) {
    console.error("GET /api/reports/fees failed:", err);
    return NextResponse.json({ error: "Failed to build the fee report" }, { status: 500 });
  }
}
