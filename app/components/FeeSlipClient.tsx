"use client";

import { useRef, useState } from "react";
import { Download, Printer } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { useStatement } from "@/app/components/fees/FeeStatementView";
import { fmtDate, inr, modeLabel } from "@/app/components/fees/ui";

/** Printable consolidated fee statement for one student. */
export function FeeSlipClient({ studentId }: { studentId: string }) {
  const { data, error, loading } = useStatement(studentId);
  const slipRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!slipRef.current || !data) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const canvas = await html2canvas(slipRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const img = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const width = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const height = (canvas.height * width) / canvas.width;
      // Long statements flow onto extra pages.
      for (let offset = 0; offset < height; offset += pageHeight) {
        if (offset > 0) pdf.addPage();
        pdf.addImage(img, "PNG", 0, -offset, width, height);
      }
      pdf.save(`${data.student.name.replace(/\s+/g, "_")}_Fee_Statement.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  if (loading) return <div className="mx-auto h-[700px] max-w-4xl animate-pulse rounded-xl bg-white" />;
  if (error || !data) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
        {error ?? "Could not load the fee statement"}
      </div>
    );
  }

  const { school, student, accounts, summary } = data;
  const receipts = accounts
    .flatMap((a) => a.receipts.filter((r) => !r.voided).map((r) => ({ ...r, fee: a.structureName })))
    .sort((a, b) => a.paymentDate.localeCompare(b.paymentDate));

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <div className="flex justify-end gap-2 print:hidden">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-4 w-4" /> Print
        </Button>
        <Button size="sm" onClick={handleDownload} disabled={downloading}>
          <Download className="mr-1.5 h-4 w-4" /> {downloading ? "Preparing…" : "Download PDF"}
        </Button>
      </div>

      <div ref={slipRef} className="rounded-xl border border-gray-200 bg-white p-8 text-gray-900 shadow-sm print:border-0 print:shadow-none md:p-10">
        <div className="flex items-start gap-4 border-b-2 border-gray-900 pb-5">
          {school?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- html2canvas needs a plain <img>
            <img src={school.logoUrl} alt="" crossOrigin="anonymous" className="h-16 w-16 object-contain" />
          ) : null}
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{school?.name ?? "School"}</h1>
            {school?.address ? <p className="mt-0.5 text-sm text-gray-600">{school.address}</p> : null}
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Fee Statement</p>
            <p className="mt-1 text-sm text-gray-600">As on {fmtDate(new Date())}</p>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 text-sm md:grid-cols-4">
          <Field label="Student" value={student.name} />
          <Field label="Admission no." value={student.admissionNo} />
          <Field label="Class / Roll" value={`${student.className || "—"} / ${student.rollNumber}`} />
          <Field label="Father's name" value={student.fatherName ?? "—"} />
        </dl>

        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-y border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-3 py-2 font-medium">Fee</th>
              <th className="px-3 py-2 font-medium">Session</th>
              <th className="px-3 py-2 font-medium">Due</th>
              <th className="px-3 py-2 text-right font-medium">Payable</th>
              <th className="px-3 py-2 text-right font-medium">Paid</th>
              <th className="px-3 py-2 text-right font-medium">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 tabular-nums">
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500">No fees assigned.</td>
              </tr>
            ) : (
              accounts.map((a) => (
                <tr key={a.accountId}>
                  <td className="px-3 py-2.5">
                    <span className="font-medium">{a.structureName}</span>
                    <span className="block text-xs text-gray-500">
                      {[
                        a.breakdown.tuition ? `Tuition ${inr(a.breakdown.tuition)}` : null,
                        a.breakdown.exam ? `Exam ${inr(a.breakdown.exam)}` : null,
                        a.breakdown.misc ? `Misc ${inr(a.breakdown.misc)}` : null,
                        a.breakdown.transport && a.includesTransport ? `Transport ${inr(a.breakdown.transport)}` : null,
                        a.balance.discount ? `Concession −${inr(a.balance.discount)}` : null,
                        a.balance.lateFine ? `Late fine +${inr(a.balance.lateFine)}` : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">{a.session?.name ?? "—"}</td>
                  <td className={`px-3 py-2.5 ${a.isOverdue ? "font-medium text-red-600" : ""}`}>{fmtDate(a.dueDate)}</td>
                  <td className="px-3 py-2.5 text-right">{inr(a.balance.netPayable)}</td>
                  <td className="px-3 py-2.5 text-right">{inr(a.balance.amountPaid)}</td>
                  <td className="px-3 py-2.5 text-right font-medium">{inr(a.balance.remainAmount)}</td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-900 font-semibold tabular-nums">
              <td className="px-3 py-3" colSpan={3}>Total</td>
              <td className="px-3 py-3 text-right">{inr(summary.totalPayable)}</td>
              <td className="px-3 py-3 text-right">{inr(summary.totalPaid)}</td>
              <td className="px-3 py-3 text-right">{inr(summary.totalRemaining)}</td>
            </tr>
          </tfoot>
        </table>

        {receipts.length > 0 ? (
          <>
            <h2 className="mt-8 text-xs font-semibold uppercase tracking-wide text-gray-500">Payment history</h2>
            <table className="mt-2 w-full text-sm">
              <tbody className="divide-y divide-gray-100 tabular-nums">
                {receipts.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2 pr-3 font-mono text-xs">{r.receiptNo}</td>
                    <td className="px-3 py-2">{fmtDate(r.paymentDate)}</td>
                    <td className="px-3 py-2">{r.fee}</td>
                    <td className="px-3 py-2">{modeLabel(r.paymentMode)}</td>
                    <td className="py-2 pl-3 text-right">{inr(r.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        ) : null}

        <div className="mt-12 grid grid-cols-2 gap-10 text-sm">
          <div>
            <div className="mb-1 h-10 border-b border-gray-400" />
            <p className="text-xs uppercase tracking-wide text-gray-500">Parent / Guardian</p>
          </div>
          <div>
            <div className="mb-1 h-10 border-b border-gray-400" />
            <p className="text-xs uppercase tracking-wide text-gray-500">Authorised signatory</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
