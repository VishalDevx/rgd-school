import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "STUDENT") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const student = await db.student.findUnique({
      where: { userId: session.user.id },
    });

    if (!student) {
      return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    if (!student.active) {
      return NextResponse.json({ error: "Account deactivated. Contact admin." }, { status: 403 });
    }

    // Get all fee payments for this student (across all sessions)
    const feePayments = await db.feePayment.findMany({
      where: { studentId: student.id },
      include: {
        feeStructure: {
          include: {
            class: {
              include: {
                academicSession: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Get all unique classIds from historical payments
    const historicalClassIds = [
      ...new Set(
        feePayments
          .map((p) => p.feeStructure.classId)
          .filter((id): id is string => id !== null)
      ),
    ];

    // Fetch fee structures for current class AND all historical classes
    const allClassIds = [
      ...new Set([...(student.classId ? [student.classId] : []), ...historicalClassIds]),
    ];

    const feeStructures = await db.feeStructure.findMany({
      where: { classId: { in: allClassIds } },
      include: {
        class: {
          include: {
            academicSession: true,
          },
        },
        payments: {
          where: { studentId: student.id },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Group fee structures by academic session
    const sessionMap = new Map<string, {
      sessionId: string;
      sessionName: string;
      isActive: boolean;
      classes: Array<{
        classId: string;
        className: string;
        structures: Array<{
          id: string;
          name: string | null;
          total: string;
          monthlyFee: string | null;
          totalMonths: number;
          transportFee: string | null;
          usesTransport: boolean;
          paidAmount: number;
          remainingAmount: number;
          status: "PENDING" | "PARTIAL" | "PAID";
        }>;
      }>;
    }>();

    for (const fs of feeStructures) {
      const session = fs.class.academicSession;
      if (!session) continue;

      const key = session.id;
      if (!sessionMap.has(key)) {
        sessionMap.set(key, {
          sessionId: session.id,
          sessionName: session.name,
          isActive: session.isActive,
          classes: [],
        });
      }

      let classEntry = sessionMap.get(key)!.classes.find(
        (c) => c.classId === fs.classId
      );
      if (!classEntry) {
        classEntry = {
          classId: fs.classId,
          className: fs.class.name,
          structures: [],
        };
        sessionMap.get(key)!.classes.push(classEntry);
      }

      const payment = fs.payments?.[0];
      const totalAmount = Number(fs.total);
      let adjustedTotal = totalAmount;
      if (fs.transportFee && !student.usesTransport) {
        adjustedTotal -= Number(fs.transportFee);
      }
      const paidAmount = payment ? Number(payment.amountPaid) : 0;
      const remainingAmount = Math.max(adjustedTotal - paidAmount, 0);

      classEntry.structures.push({
        id: fs.id,
        name: fs.name,
        total: fs.total.toString(),
        monthlyFee: fs.monthlyFee?.toString() ?? null,
        totalMonths: fs.totalMonths,
        transportFee: fs.transportFee?.toString() ?? null,
        usesTransport: student.usesTransport,
        paidAmount,
        remainingAmount,
        status: payment?.status ?? "PENDING",
      });
    }

    const sessions = Array.from(sessionMap.values()).sort((a, b) => {
      if (a.isActive) return -1;
      if (b.isActive) return 1;
      return a.sessionName.localeCompare(b.sessionName);
    });

    // Overall summary
    const allPayments = feePayments;
    const totalPaid = allPayments.reduce(
      (sum, p) => sum + Number(p.amountPaid),
      0
    );
    const totalPending = allPayments.reduce(
      (sum, p) => sum + Number(p.remainAmount),
      0
    );

    const paidCount = allPayments.filter((p) => p.status === "PAID").length;
    const pendingCount = allPayments.filter(
      (p) => p.status === "PENDING" || p.status === "PARTIAL"
    ).length;

    return NextResponse.json({
      sessions,
      feePayments,
      summary: {
        totalPaid,
        totalPending,
        paidCount,
        pendingCount,
        totalPayments: allPayments.length,
      },
    });
  } catch (error) {
    console.error("Error fetching student fees:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
