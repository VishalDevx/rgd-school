"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Wallet, Receipt, AlertCircle, CheckCircle2, Clock, ChevronDown, ChevronRight } from "lucide-react";
import Link from "next/link";
import Pagination from "@/app/components/Pagination";

interface SessionClass {
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
}

interface FeeSession {
  sessionId: string;
  sessionName: string;
  isActive: boolean;
  classes: SessionClass[];
}

interface FeePayment {
  id: string;
  amountPaid: string;
  remainAmount: string;
  status: "PENDING" | "PARTIAL" | "PAID";
  paymentDate: string | null;
  createdAt: string;
  feeStructure: {
    id: string;
    name: string | null;
    total: string;
    class: {
      name: string;
    };
  };
}

interface FeesData {
  sessions: FeeSession[];
  feePayments: FeePayment[];
  summary: {
    totalPaid: number;
    totalPending: number;
    paidCount: number;
    pendingCount: number;
    totalPayments: number;
  };
}

export default function StudentFeesPage() {
  const [data, setData] = useState<FeesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchFees() {
      try {
        const res = await fetch("/api/student/fees");
        if (res.ok) {
          const feesData = await res.json();
          setData(feesData);
          // Auto-expand active session
          const activeSession = feesData.sessions?.find((s: FeeSession) => s.isActive);
          if (activeSession) {
            setExpandedSessions(new Set([activeSession.sessionId]));
          }
        }
      } catch (error) {
        console.error("Error fetching fees:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchFees();
  }, []);

  const feePayments = data?.feePayments ?? [];
  const PAGE_SIZE = 10;
  const totalPages = Math.ceil(feePayments.length / PAGE_SIZE);
  const paginatedPayments = feePayments.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSession = (id: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case "PARTIAL":
        return (
          <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">
            <Clock className="h-3 w-3 mr-1" />
            Partial
          </Badge>
        );
      case "PENDING":
        return (
          <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
            <AlertCircle className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Failed to load fees data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Fees Management</h1>
          <p className="text-gray-500 mt-1">Fee history across all academic years</p>
        </div>
        <Link
          href="/student/fees/slip"
          className="inline-flex items-center px-4 py-2 rounded-md bg-black text-white text-sm font-semibold hover:bg-gray-800 transition"
        >
          <Receipt className="h-4 w-4 mr-2" />
          Download Fee Statement
        </Link>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Paid
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₹{data.summary.totalPaid.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {data.summary.paidCount} payment{data.summary.paidCount !== 1 ? "s" : ""} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending Amount
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ₹{data.summary.totalPending.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {data.summary.pendingCount} payment{data.summary.pendingCount !== 1 ? "s" : ""} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Academic Years
            </CardTitle>
            <Receipt className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.sessions.length}
            </div>
            <p className="text-xs text-gray-500 mt-1">Session{data.sessions.length !== 1 ? "s" : ""} with fee records</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Payments
            </CardTitle>
            <Wallet className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.summary.totalPayments}
            </div>
            <p className="text-xs text-gray-500 mt-1">All fee records</p>
          </CardContent>
        </Card>
      </div>

      {/* Fee History by Academic Session */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Fee History by Academic Year
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.sessions.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No fee records found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {data.sessions.map((session) => {
                const sessionTotal = session.classes.reduce(
                  (sum, c) => sum + c.structures.reduce((s, fs) => s + Number(fs.total), 0),
                  0
                );
                const sessionPaid = session.classes.reduce(
                  (sum, c) => sum + c.structures.reduce((s, fs) => s + fs.paidAmount, 0),
                  0
                );
                const sessionRemaining = session.classes.reduce(
                  (sum, c) => sum + c.structures.reduce((s, fs) => s + fs.remainingAmount, 0),
                  0
                );
                const isExpanded = expandedSessions.has(session.sessionId);

                return (
                  <div key={session.sessionId} className="border rounded-lg overflow-hidden">
                    {/* Session Header */}
                    <button
                      onClick={() => toggleSession(session.sessionId)}
                      className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-gray-400" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{session.sessionName}</span>
                            {session.isActive && (
                              <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">
                                Current
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-500">
                            {session.classes.map((c) => c.className).join(", ")}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div className="text-right">
                          <p className="text-gray-500">Total</p>
                          <p className="font-semibold">₹{sessionTotal.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-500">Paid</p>
                          <p className="font-semibold text-green-600">₹{sessionPaid.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-gray-500">Remaining</p>
                          <p className={`font-semibold ${sessionRemaining > 0 ? "text-red-600" : "text-green-600"}`}>
                            ₹{sessionRemaining.toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="border-t bg-gray-50 p-4 space-y-4">
                        {session.classes.map((cls) => (
                          <div key={cls.classId}>
                            <h4 className="text-sm font-semibold text-gray-700 mb-2">{cls.className}</h4>
                            <div className="space-y-2">
                              {cls.structures.map((structure) => {
                                const totalAmount = Number(structure.total);
                                let adjustedTotal = totalAmount;
                                if (structure.transportFee && !structure.usesTransport) {
                                  adjustedTotal -= Number(structure.transportFee);
                                }
                                const progressPct = adjustedTotal > 0
                                  ? Math.round((structure.paidAmount / adjustedTotal) * 100)
                                  : 0;

                                return (
                                  <div
                                    key={structure.id}
                                    className="bg-white p-3 rounded border flex items-center justify-between"
                                  >
                                    <div className="flex-1">
                                      <p className="font-medium text-gray-900 text-sm">
                                        {structure.name || "Fee Structure"}
                                      </p>
                                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                        <span>Total: <strong>₹{adjustedTotal.toLocaleString()}</strong></span>
                                        <span>Paid: <strong className="text-green-600">₹{structure.paidAmount.toLocaleString()}</strong></span>
                                        <span>Remaining: <strong className={structure.remainingAmount > 0 ? "text-red-600" : "text-green-600"}>
                                          ₹{structure.remainingAmount.toLocaleString()}
                                        </strong></span>
                                      </div>
                                      {structure.remainingAmount > 0 && (
                                        <div className="mt-2 w-full bg-gray-200 rounded-full h-1.5 max-w-xs">
                                          <div
                                            className="bg-green-600 h-1.5 rounded-full transition-all"
                                            style={{ width: `${progressPct}%` }}
                                          />
                                        </div>
                                      )}
                                    </div>
                                    <div className="ml-3">
                                      {getStatusBadge(structure.status)}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            All Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.feePayments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Fee Structure
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Class
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Amount Paid
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Remaining
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Status
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Payment Date
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedPayments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <p className="font-medium text-gray-900">
                          {payment.feeStructure.name || "Fee Payment"}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <p className="text-sm text-gray-500">
                          {payment.feeStructure.class.name}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-green-600">
                          ₹{Number(payment.amountPaid).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-red-600">
                          ₹{Number(payment.remainAmount).toLocaleString()}
                        </span>
                      </td>
                      <td className="py-4 px-4">{getStatusBadge(payment.status)}</td>
                      <td className="py-4 px-4 text-sm text-gray-500">
                        {payment.paymentDate
                          ? format(new Date(payment.paymentDate), "MMM dd, yyyy")
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Wallet className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No payment history found</p>
            </div>
          )}
          {paginatedPayments.length > 0 && (
            <Pagination
              page={page}
              totalPages={totalPages}
              total={feePayments.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}