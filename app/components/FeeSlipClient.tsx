"use client";

import { useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import Image from "next/image";

interface FeeSlipRow {
  structureId: string;
  structureName: string;
  examFee: number;
  transportFee: number;
  miscFee: number;
  monthlyFee: number | null;
  totalMonths: number;
  totalFee: number;
  adjustedTotal: number;
  totalPaid: number;
  remainAmount: number;
  status: string;
  payments: Array<{
    id: string;
    amountPaid: number;
    paymentDate: string | null;
    status: string;
  }>;
}

interface FeeSlipData {
  school: {
    name: string;
    address: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    logoUrl: string | null;
  } | null;
  student: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    admissionNo: string;
    rollNumber: string;
    className: string;
    fatherName: string | null;
    usesTransport: boolean;
    transport: {
      routeName: string | null;
      stopName: string | null;
      busNumber: string | null;
    } | null;
  };
  feeSlip: FeeSlipRow[];
  summary: {
    grandTotal: number;
    grandPaid: number;
    grandRemaining: number;
  };
}

function fmtDate(v?: string | null) {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString();
}

export function FeeSlipClient({ studentId }: { studentId: string }) {
  const [data, setData] = useState<FeeSlipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const slipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);
    fetch(`/api/fees/slip?studentId=${studentId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to fetch fee slip");
        return res.json();
      })
      .then(setData)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed"))
      .finally(() => setLoading(false));
  }, [studentId]);

  const handleDownload = async () => {
    if (!slipRef.current || !data) return;

    const canvas = await html2canvas(slipRef.current, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
    });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    if (pdfHeight > pdf.internal.pageSize.getHeight()) {
      const pageHeight = pdf.internal.pageSize.getHeight();
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
    } else {
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    }

    const safeName = data.student.name.replaceAll(/\s+/g, "_");
    pdf.save(`${safeName}_Fee_Statement.pdf`);
  };

  if (loading) return <div className="py-12 text-center text-gray-500">Loading fee slip…</div>;
  if (error) return <div className="py-12 text-center text-red-600">{error}</div>;
  if (!data) return null;

  const schoolName = data.school?.name ?? "School";

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 bg-gray-100">
      <div className="flex items-center justify-end gap-3 mb-4">
        <button
          onClick={() => window.print()}
          className="rounded-md border bg-white px-4 py-2 text-sm font-semibold hover:bg-gray-50"
        >
          Print
        </button>
        <button
          onClick={handleDownload}
          className="rounded-md bg-black px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
        >
          Download Fee Statement PDF
        </button>
      </div>

      <div ref={slipRef} className="bg-white p-8 md:p-10 text-gray-900">
        {/* Header */}
        <div className="flex items-start gap-4 border-b pb-6 mb-6">
          {data.school?.logoUrl ? (
            <div className="relative h-14 w-14 shrink-0">
              <Image
                src={data.school.logoUrl}
                alt={`${schoolName} logo`}
                fill
                className="object-contain"
                sizes="56px"
                priority
              />
            </div>
          ) : null}
          <div className="flex-1">
            <h1 className="text-2xl font-extrabold tracking-wide">{schoolName}</h1>
            {data.school?.address ? (
              <p className="text-sm text-gray-700 mt-1">{data.school.address}</p>
            ) : null}
            <p className="text-xs text-gray-600 mt-2">Consolidated Fee Statement</p>
          </div>
          <div className="text-right text-xs text-gray-600">
            <div>Date: {new Date().toLocaleDateString()}</div>
            <div>Admission No: {data.student.admissionNo}</div>
          </div>
        </div>

        {/* Student Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-6">
          <div className="border px-3 py-2">
            <p className="text-xs uppercase tracking-widest text-gray-600">Student Name</p>
            <p className="font-semibold mt-0.5">{data.student.name}</p>
          </div>
          <div className="border px-3 py-2">
            <p className="text-xs uppercase tracking-widest text-gray-600">Class</p>
            <p className="font-semibold mt-0.5">{data.student.className}</p>
          </div>
          <div className="border px-3 py-2">
            <p className="text-xs uppercase tracking-widest text-gray-600">Roll No</p>
            <p className="font-semibold mt-0.5">{data.student.rollNumber}</p>
          </div>
          <div className="border px-3 py-2">
            <p className="text-xs uppercase tracking-widest text-gray-600">Father Name</p>
            <p className="font-semibold mt-0.5">{data.student.fatherName ?? "—"}</p>
          </div>
        </div>

        {/* Transport Info */}
        {data.student.transport && (
          <div className="bg-blue-50 border border-blue-200 rounded-md px-4 py-2 mb-6 text-sm">
            <p className="font-semibold text-blue-800">Transport Details</p>
            <div className="grid grid-cols-3 gap-2 mt-1 text-blue-700">
              {data.student.transport.routeName && <span>Route: {data.student.transport.routeName}</span>}
              {data.student.transport.stopName && <span>Stop: {data.student.transport.stopName}</span>}
              {data.student.transport.busNumber && <span>Bus: {data.student.transport.busNumber}</span>}
            </div>
          </div>
        )}

        {/* Fee Table */}
        <div className="overflow-x-auto mb-6">
          <table className="w-full min-w-[700px] border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border px-3 py-2 text-left font-semibold">Fee Structure</th>
                <th className="border px-3 py-2 text-right font-semibold">Monthly</th>
                <th className="border px-3 py-2 text-right font-semibold">Exam</th>
                <th className="border px-3 py-2 text-right font-semibold">Transport</th>
                <th className="border px-3 py-2 text-right font-semibold">Misc</th>
                <th className="border px-3 py-2 text-right font-semibold">Total</th>
                <th className="border px-3 py-2 text-right font-semibold">Paid</th>
                <th className="border px-3 py-2 text-right font-semibold">Balance</th>
              </tr>
            </thead>
            <tbody>
              {data.feeSlip.map((row) => (
                <tr key={row.structureId}>
                  <td className="border px-3 py-2 font-medium">{row.structureName}</td>
                  <td className="border px-3 py-2 text-right">
                    {row.monthlyFee ? `₹${row.monthlyFee}/mo×${row.totalMonths}` : "—"}
                  </td>
                  <td className="border px-3 py-2 text-right">₹{row.examFee.toLocaleString()}</td>
                  <td className="border px-3 py-2 text-right">₹{row.transportFee.toLocaleString()}</td>
                  <td className="border px-3 py-2 text-right">₹{row.miscFee.toLocaleString()}</td>
                  <td className="border px-3 py-2 text-right font-semibold">₹{row.adjustedTotal.toLocaleString()}</td>
                  <td className="border px-3 py-2 text-right text-green-600">₹{row.totalPaid.toLocaleString()}</td>
                  <td className="border px-3 py-2 text-right text-red-600 font-semibold">
                    ₹{row.remainAmount.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50 font-bold">
                <td className="border px-3 py-2">Grand Total</td>
                <td colSpan={5}></td>
                <td className="border px-3 py-2 text-right">₹{data.summary.grandTotal.toLocaleString()}</td>
                <td className="border px-3 py-2 text-right text-green-600">₹{data.summary.grandPaid.toLocaleString()}</td>
                <td className="border px-3 py-2 text-right text-red-600">
                  ₹{data.summary.grandRemaining.toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Payment History */}
        {data.feeSlip.some((r) => r.payments.length > 0) && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-gray-600 mb-2">Payment History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border px-3 py-1.5 text-left font-semibold">Date</th>
                    <th className="border px-3 py-1.5 text-left font-semibold">Structure</th>
                    <th className="border px-3 py-1.5 text-right font-semibold">Amount</th>
                    <th className="border px-3 py-1.5 text-center font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.feeSlip.map((row) =>
                    row.payments.map((p) => (
                      <tr key={p.id}>
                        <td className="border px-3 py-1.5">{fmtDate(p.paymentDate)}</td>
                        <td className="border px-3 py-1.5">{row.structureName}</td>
                        <td className="border px-3 py-1.5 text-right">₹{p.amountPaid.toLocaleString()}</td>
                        <td className="border px-3 py-1.5 text-center">
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded ${
                              p.status === "PAID"
                                ? "bg-green-100 text-green-700"
                                : p.status === "PARTIAL"
                                ? "bg-yellow-100 text-yellow-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {p.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary Bar */}
        <div className="grid grid-cols-3 gap-4 text-sm mt-8">
          <div className="border border-green-500 rounded px-3 py-2 text-center">
            <p className="text-xs uppercase tracking-widest text-gray-600">Total Paid</p>
            <p className="text-lg font-bold text-green-600">₹{data.summary.grandPaid.toLocaleString()}</p>
          </div>
          <div className="border border-red-500 rounded px-3 py-2 text-center">
            <p className="text-xs uppercase tracking-widest text-gray-600">Total Due</p>
            <p className="text-lg font-bold text-red-600">₹{data.summary.grandRemaining.toLocaleString()}</p>
          </div>
          <div className="border border-blue-500 rounded px-3 py-2 text-center">
            <p className="text-xs uppercase tracking-widest text-gray-600">Total Fee</p>
            <p className="text-lg font-bold">₹{data.summary.grandTotal.toLocaleString()}</p>
          </div>
        </div>

        {/* Signatures */}
        <div className="mt-10 grid grid-cols-2 gap-10 text-sm">
          <div>
            <div className="h-12 border-b mb-2" />
            <p className="text-xs uppercase tracking-widest text-gray-600">Parent/Guardian</p>
          </div>
          <div>
            <div className="h-12 border-b mb-2" />
            <p className="text-xs uppercase tracking-widest text-gray-600">Authorized Signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
}
