import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";
import { createAuditLog } from "@/app/lib/audit";
import { money } from "@/lib/money";

// ---------- Types ----------
interface FeeStructureBody {
  classId: string;
  categoryId?: string | null;
  name?: string | null;
  examFee?: number | string | null;
  transportFee?: number | string | null;
  miscFee?: number | string | null;
  monthlyFee?: number | string | null;
  totalMonths?: number | string | null;
}

// Convert safely to number
const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ---------- GET ----------
export async function GET() {
  const items = await db.feeStructure.findMany({
    include: { class: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}

// ---------- POST ----------
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOption);

  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as FeeStructureBody | null;

  if (!body || !body.classId) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // ----- Calculate total (support monthly fee) -----
  const monthlyFee = toNum(body.monthlyFee);
  const totalMonths = body.totalMonths != null ? toNum(body.totalMonths) : 12;

  let total: number;
  let exam: number;
  let transport: number;
  let misc: number;

  if (monthlyFee > 0) {
    // Monthly fee mode: calculate total from monthlyFee * months
    exam = toNum(body.examFee);
    transport = toNum(body.transportFee);
    misc = toNum(body.miscFee);
    total = monthlyFee * totalMonths;
  } else {
    // Legacy mode: sum of all components
    exam = toNum(body.examFee);
    transport = toNum(body.transportFee);
    misc = toNum(body.miscFee);
    total = exam + transport + misc;
  }

  // ----- Create Fee Structure -----
  const created = await db.feeStructure.create({
    data: {
      classId: body.classId,
      categoryId: body.categoryId || null,
      name: body.name ?? null,
      examFee: body.examFee != null ? money(exam.toFixed(2)) : null,
      transportFee:
        body.transportFee != null
          ? money(transport.toFixed(2))
          : null,
      miscFee:
        body.miscFee != null ? money(misc.toFixed(2)) : null,
      total: money(total.toFixed(2)),
      monthlyFee: monthlyFee > 0 ? money(monthlyFee.toFixed(2)) : null,
      totalMonths: monthlyFee > 0 ? totalMonths : 12,
    },
  });

  // ----- Fetch active students only -----
  const students = await db.student.findMany({
    where: { classId: body.classId, active: true },
  });

  // ----- Auto-create FeePayment (adjust transport fee per student) -----
  // NOTE: previously db.$transaction([...promises]). MongoDB Atlas free tier
  // has no replica set, so these independent inserts run concurrently instead.
  // If one fails the rest still commit.
  if (students.length > 0) {
    await Promise.all(
      students.map((s) => {
        let adjustedTotal = total;
        if (!s.usesTransport && transport > 0) {
          adjustedTotal -= transport;
        }
        return db.feePayment.create({
          data: {
            studentId: s.id,
            feeStructureId: created.id,
            amountPaid: 0,
            remainAmount: money(adjustedTotal),
            status: "PENDING",
          },
        });
      })
    );
  }

  await createAuditLog({
    userId: session.user.id,
    action: "CREATE",
    entity: "FEE_STRUCTURE",
    entityId: created.id,
    newValue: { classId: body.classId, total, studentsAffected: students.length },
  });

  return NextResponse.json(created, { status: 201 });
}
