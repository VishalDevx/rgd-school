"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";
import type { ReceiptData } from "@/lib/fees/service";
import { amountInWords } from "@/lib/fees/calc";
import { Button } from "@/app/components/ui/button";
import { fmtDate, inr, modeLabel } from "@/app/components/fees/ui";

/**
 * Printable fee receipt for ONE payment. The balance shown is the balance
 * right after this payment, so a reprint always matches the original.
 */
export function FeeReceiptClient({
  paymentId,
  backHref,
  actions,
}: {
  paymentId: string;
  backHref?: string;
  actions?: (data: ReceiptData, reload: () => void) => React.ReactNode;
}) {
  const [data, setData] = useState<ReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const [downloading, setDownloading] = useState(false);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!paymentId) return;
    let cancelled = false;
    fetch(`/api/fees/payments/${paymentId}`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? "Could not load the receipt");
        return body as ReceiptData;
      })
      .then((d) => !cancelled && setData(d))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Could not load the receipt"));
    return () => {
      cancelled = true;
    };
  }, [paymentId, version]);

  const handleDownload = async () => {
    if (!receiptRef.current || !data) return;
    setDownloading(true);
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
      const canvas = await html2canvas(receiptRef.current, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const pdf = new jsPDF("p", "mm", "a4");
      const width = pdf.internal.pageSize.getWidth();
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, width, (canvas.height * width) / canvas.width);
      pdf.save(`${data.receipt.receiptNo}_${data.student.name.replace(/\s+/g, "_")}.pdf`);
    } finally {
      setDownloading(false);
    }
  };

  if (error) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">{error}</div>
    );
  }
  if (!data) {
    return <div className="mx-auto h-[640px] max-w-3xl animate-pulse rounded-xl bg-white" />;
  }

  const { school, student, structure, receipt, balanceAfter } = data;
  const received = receipt.amount;
  const schoolName = school?.name ?? "School";

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        {backHref ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={backHref}>
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Link>
          </Button>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap gap-2">
          {actions?.(data, () => setVersion((v) => v + 1))}
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" /> Print
          </Button>
          <Button size="sm" onClick={handleDownload} disabled={downloading}>
            <Download className="mr-1.5 h-4 w-4" /> {downloading ? "Preparing…" : "Download PDF"}
          </Button>
        </div>
      </div>

      <div ref={receiptRef} className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-8 text-gray-900 shadow-sm print:border-0 print:shadow-none md:p-10">
        {receipt.voided ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
            <span className="rotate-[-24deg] rounded-xl border-8 border-red-500/30 px-10 py-2 text-8xl font-black tracking-widest text-red-500/25">
              VOID
            </span>
          </div>
        ) : null}

        {/* Letterhead */}
        <div className="flex items-start gap-4 border-b-2 border-gray-900 pb-5">
          {school?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- html2canvas needs a plain <img>
            <img src={school.logoUrl} alt="" crossOrigin="anonymous" className="h-16 w-16 object-contain" />
          ) : null}
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">{schoolName}</h1>
            {school?.address ? <p className="mt-0.5 text-sm text-gray-600">{school.address}</p> : null}
            <p className="mt-0.5 text-xs text-gray-500">
              {[school?.contactPhone, school?.contactEmail].filter(Boolean).join(" · ")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Fee Receipt</p>
            <p className="mt-1 font-mono text-lg font-semibold">{receipt.receiptNo}</p>
            <p className="text-sm text-gray-600">{fmtDate(receipt.paymentDate)}</p>
          </div>
        </div>

        {/* Student */}
        <dl className="mt-6 grid grid-cols-2 gap-x-8 gap-y-3 text-sm md:grid-cols-3">
          <Field label="Student" value={student.name} />
          <Field label="Admission no." value={student.admissionNo} />
          <Field label="Class / Roll" value={`${student.className || "—"} / ${student.rollNumber}`} />
          <Field label="Father's name" value={student.fatherName ?? "—"} />
          <Field label="Fee" value={structure.name} />
          <Field label="Payment mode" value={`${modeLabel(receipt.paymentMode)}${receipt.referenceNo ? ` · Ref ${receipt.referenceNo}` : ""}`} />
        </dl>

        {/* Amounts */}
        <table className="mt-6 w-full text-sm">
          <thead>
            <tr className="border-y border-gray-200 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-3 py-2 font-medium">Particulars</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 tabular-nums">
            <tr>
              <td className="px-3 py-2.5">Amount received towards {structure.name}</td>
              <td className="px-3 py-2.5 text-right">{inr(received)}</td>
            </tr>
            {receipt.lateFine > 0 ? (
              <tr>
                <td className="px-3 py-2.5 text-gray-600">Late fine charged (included above)</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{inr(receipt.lateFine)}</td>
              </tr>
            ) : null}
            {receipt.discount > 0 ? (
              <tr>
                <td className="px-3 py-2.5 text-gray-600">Concession granted</td>
                <td className="px-3 py-2.5 text-right text-gray-600">{inr(receipt.discount)}</td>
              </tr>
            ) : null}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-gray-900 text-base font-semibold">
              <td className="px-3 py-3">Total received</td>
              <td className="px-3 py-3 text-right tabular-nums">{inr(received)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="mt-2 text-sm italic text-gray-600">In words: {amountInWords(received)}</p>

        {/* Account position after this payment */}
        <div className="mt-6 grid grid-cols-3 divide-x divide-gray-200 rounded-lg border border-gray-200 text-center text-sm">
          <Summary label="Net payable" value={inr(balanceAfter.netPayable)} />
          <Summary label="Paid to date" value={inr(balanceAfter.amountPaid)} />
          <Summary label="Balance due" value={inr(balanceAfter.remainAmount)} strong />
        </div>

        {receipt.remarks ? <p className="mt-4 text-sm text-gray-600">Remarks: {receipt.remarks}</p> : null}
        {receipt.voided ? (
          <p className="mt-4 rounded-md bg-red-50 p-3 text-sm text-red-700">
            Voided on {fmtDate(receipt.voidedAt)}
            {receipt.voidedBy ? ` by ${receipt.voidedBy}` : ""}: {receipt.voidReason}
          </p>
        ) : null}

        <div className="mt-12 grid grid-cols-2 gap-10 text-sm">
          <div>
            <div className="mb-1 h-10 border-b border-gray-400" />
            <p className="text-xs uppercase tracking-wide text-gray-500">
              Received by{receipt.collectedBy ? ` · ${receipt.collectedBy}` : ""}
            </p>
          </div>
          <div>
            <div className="mb-1 h-10 border-b border-gray-400" />
            <p className="text-xs uppercase tracking-wide text-gray-500">Authorised signatory</p>
          </div>
        </div>
        <p className="mt-8 text-center text-[11px] text-gray-400">
          This is a computer-generated receipt. Please keep it for your records.
        </p>
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

function Summary({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="px-3 py-3">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-0.5 tabular-nums ${strong ? "text-lg font-semibold" : "font-medium"}`}>{value}</p>
    </div>
  );
}
