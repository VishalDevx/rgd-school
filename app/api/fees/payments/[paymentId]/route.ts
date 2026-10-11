import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const session = await getServerSession(authOption);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { paymentId } = await params;
  if (!paymentId) {
    return NextResponse.json({ error: "Missing paymentId" }, { status: 400 });
  }

  const payment = await db.feePayment.findUnique({
    where: { id: paymentId },
    select: {
      id: true,
      amountPaid: true,
      remainAmount: true,
      status: true,
      paymentDate: true,
      createdAt: true,
      razorpayOrder: true,
      razorpayPaymentId: true,
      receiptUrl: true,
      feeStructure: { select: { id: true, name: true, total: true } },
      student: {
        select: {
          id: true,
          admissionNo: true,
          rollNumber: true,
          userId: true,
          user: { select: { name: true, email: true, phone: true } },
          class: { select: { name: true, grade: true, section: true } },
        },
      },
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  // Students may only access their own payment receipts.
  if (session.user.role === "STUDENT" && payment.student.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Only ADMIN/STAFF/STUDENT roles are expected in this app.
  if (!["ADMIN", "STAFF", "STUDENT"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const school = await db.schoolSettings.findFirst({
    orderBy: { createdAt: "desc" },
    select: { name: true, address: true, contactEmail: true, contactPhone: true, logoUrl: true },
  });

  return NextResponse.json({ payment, school });
}

