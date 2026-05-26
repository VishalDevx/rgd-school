import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    let studentId = searchParams.get("studentId") ?? "";

    if (session.user.role === "STUDENT") {
      const student = await db.student.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!student) return new NextResponse("Student not found", { status: 404 });
      studentId = student.id;
    } else if (!studentId) {
      return new NextResponse("studentId is required", { status: 400 });
    }

    const student = await db.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        class: true,
        transport: true,
      },
    });

    if (!student) {
      return new NextResponse("Student not found", { status: 404 });
    }

    const school = await db.schoolSettings.findFirst({
      orderBy: { createdAt: "desc" },
      select: { name: true, address: true, contactEmail: true, contactPhone: true, logoUrl: true },
    });

    // Get all fee payments (across all sessions)
    const feePayments = await db.feePayment.findMany({
      where: { studentId },
      include: { feeStructure: true },
      orderBy: { createdAt: "desc" },
    });

    // Get all unique classIds from historical payments + current class
    const historicalClassIds = [
      ...new Set(
        feePayments
          .map((p) => p.feeStructure.classId)
          .filter((id): id is string => id !== null)
      ),
    ];
    const allClassIds = [
      ...new Set([...(student.classId ? [student.classId] : []), ...historicalClassIds]),
    ];

    const feeStructures = await db.feeStructure.findMany({
      where: { classId: { in: allClassIds } },
      include: { class: { include: { academicSession: true } } },
      orderBy: { createdAt: "desc" },
    });

    const slipData = feeStructures.map((fs) => {
      const paymentsForStructure = feePayments.filter(
        (p) => p.feeStructureId === fs.id
      );

      const totalPaid = paymentsForStructure.reduce(
        (sum, p) => sum + Number(p.amountPaid),
        0
      );

      const lastPayment = paymentsForStructure[0] ?? null;
      const status = lastPayment?.status ?? "PENDING";

      let adjustedTotal = Number(fs.total);
      if (fs.transportFee && !student.usesTransport) {
        adjustedTotal -= Number(fs.transportFee);
      }

      return {
        structureId: fs.id,
        structureName: fs.name ?? "Fee Structure",
        academicSession: {
          id: fs.class.academicSession?.id ?? "",
          name: fs.class.academicSession?.name ?? "",
          isActive: fs.class.academicSession?.isActive ?? false,
        },
        className: fs.class.name,
        examFee: Number(fs.examFee ?? 0),
        transportFee: student.usesTransport ? Number(fs.transportFee ?? 0) : 0,
        miscFee: Number(fs.miscFee ?? 0),
        monthlyFee: fs.monthlyFee ? Number(fs.monthlyFee) : null,
        totalMonths: fs.totalMonths,
        totalFee: Number(fs.total),
        adjustedTotal,
        totalPaid,
        remainAmount: Math.max(adjustedTotal - totalPaid, 0),
        status,
        payments: paymentsForStructure.map((p) => ({
          id: p.id,
          amountPaid: Number(p.amountPaid),
          paymentDate: p.paymentDate,
          status: p.status,
        })),
      };
    });

    const grandTotal = slipData.reduce((s, d) => s + d.adjustedTotal, 0);
    const grandPaid = slipData.reduce((s, d) => s + d.totalPaid, 0);
    const grandRemaining = slipData.reduce((s, d) => s + d.remainAmount, 0);

    return NextResponse.json({
      school,
      student: {
        id: student.id,
        name: student.user.name,
        email: student.user.email,
        phone: student.user.phone,
        admissionNo: student.admissionNo,
        rollNumber: student.rollNumber,
        className: student.class?.name ?? "",
        fatherName: student.fatherName,
        usesTransport: student.usesTransport,
        transport: student.transport[0] ?? null,
      },
      feeSlip: slipData,
      summary: {
        grandTotal,
        grandPaid,
        grandRemaining,
      },
    });
  } catch (error) {
    console.error("FEE_SLIP_ERROR:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
