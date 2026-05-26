import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authOption } from "@/app/lib/auth";
import { db } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

import { Button } from "@/app/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/app/components/ui/card";

import { PaymentsTrendChart } from "@/app/components/charts/payments-trend-chart";
import { FeeStatusChart } from "@/app/components/charts/fee-status-chart";
import RecentPaymentsTable from "@/app/components/RecentPaymentsTable";

type FeeStructureRaw = {
  id: string;
  name: string | null;
  amount: Decimal;
  examFee: Decimal | null;
  transportFee: Decimal | null;
  miscFee: Decimal | null;
  total: Decimal;
  isOptional: boolean;
  categoryId: string | null;
  dueDate: Date | null;
  class: { id: string; name: string } | null;
};

type FeePaymentRaw = {
  id: string;
  createdAt: Date;
  status: "PAID" | "PARTIAL" | "PENDING";
  amountPaid: Decimal;
  remainAmount: Decimal;
  student: { id: string; user: { name: string; email: string } };
  feeStructure: { id: string; name: string | null };
};

interface PaymentRecord {
  id: string;
  createdAt: Date;
  status: "PAID" | "PARTIAL" | "UNPAID";
  amountPaid: number;
  studentName: string;
  studentEmail: string;
  feeStructureName: string | null;
}

function toNumber(value: Decimal | number | null): number {
  if (value === null) return 0;
  return typeof value === "number" ? value : value.toNumber();
}

function normalizePayment(raw: FeePaymentRaw): PaymentRecord {
  const s = raw.status;
  return {
    id: raw.id,
    createdAt: raw.createdAt,
    status: s === "PENDING" ? "UNPAID" : s,
    amountPaid: toNumber(raw.amountPaid),
    studentName: raw.student.user.name,
    studentEmail: raw.student.user.email,
    feeStructureName: raw.feeStructure.name,
  };
}

export default async function AdminFeesPage() {
  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const structuresRaw = await db.feeStructure.findMany({
    include: { class: true },
    orderBy: { createdAt: "desc" },
  }) as unknown as FeeStructureRaw[];

  const allPaymentsRaw = await db.feePayment.findMany({
    include: { student: { include: { user: true } }, feeStructure: true },
    orderBy: { createdAt: "desc" },
  }) as unknown as FeePaymentRaw[];

  const allPayments = allPaymentsRaw.map(normalizePayment);
  const recentPayments = allPayments.slice(0, 5);

  const totalPaidFull = allPayments
    .filter(p => p.status === "PAID")
    .reduce((sum, p) => sum + p.amountPaid, 0);

  const totalPartial = allPayments
    .filter(p => p.status === "PARTIAL")
    .reduce((sum, p) => sum + p.amountPaid, 0);

  const totalPaid = totalPaidFull + totalPartial;
  const totalStudents = new Set(allPaymentsRaw.map(p => p.student.user.name)).size;
  const totalStructures = structuresRaw.length;

  return (
    <div className="min-h-screen p-6 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-800">Fee Management</h1>
          <p className="text-sm text-muted-foreground">
            Oversee fee structures, track payments, and view analytics.
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button asChild variant="outline"><Link href="/admin/fees/structures">All Structures</Link></Button>
          <Button asChild><Link href="/admin/fees/structures/new">New Structure</Link></Button>
          <Button asChild variant="outline"><Link href="/admin/fees/payments/new">Record Payment</Link></Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-xl rounded-xl">
          <CardHeader><CardTitle className="text-sm font-medium">Total Collected</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalPaid.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Across all structures</p>
          </CardContent>
        </Card>
        <Card className="shadow-xl rounded-xl">
          <CardHeader><CardTitle className="text-sm font-medium">Total Students</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudents}</div>
            <p className="text-xs text-muted-foreground">With payments</p>
          </CardContent>
        </Card>
        <Card className="shadow-xl rounded-xl">
          <CardHeader><CardTitle className="text-sm font-medium">Fee Structures</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStructures}</div>
            <p className="text-xs text-muted-foreground">Active structures</p>
          </CardContent>
        </Card>
        <Card className="shadow-xl rounded-xl">
          <CardHeader><CardTitle className="text-sm font-medium">Total Transactions</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{allPaymentsRaw.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-xl rounded-xl">
          <CardHeader>
            <CardTitle>Fee Status Overview</CardTitle>
            <CardDescription>Paid vs Partial vs Pending</CardDescription>
          </CardHeader>
          <CardContent>
            <FeeStatusChart
              paid={totalPaidFull}
              partial={totalPartial}
              outstanding={allPaymentsRaw.reduce((sum, p) => sum + toNumber(p.remainAmount), 0)}
            />
          </CardContent>
        </Card>
        <Card className="shadow-xl rounded-xl h-full">
          <CardHeader>
            <CardTitle>Recent Payment Trends</CardTitle>
            <CardDescription>Last 5 transactions</CardDescription>
          </CardHeader>
          <CardContent>
            <PaymentsTrendChart payments={recentPayments.map(p => ({
              id: p.id,
              amountPaid: p.amountPaid,
              createdAt: p.createdAt,
              status: p.status === "UNPAID" ? ("PENDING" as const) : p.status,
              studentName: p.studentName,
            }))} />
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-xl rounded-xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Payments</CardTitle>
            <Link href="/admin/fees/payments" className="text-sm font-medium text-blue-600 hover:underline">View all</Link>
          </div>
        </CardHeader>
        <CardContent>
          <RecentPaymentsTable payments={recentPayments} />
        </CardContent>
      </Card>
    </div>
  );
}
