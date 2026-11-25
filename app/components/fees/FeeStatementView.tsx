"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { Receipt, Wallet, CheckCircle2, AlertTriangle, Landmark } from "lucide-react";
import type { StudentStatement } from "@/lib/fees/service";
import {
  EmptyState,
  FeeStatusBadge,
  PaidBar,
  StatTile,
  fmtDate,
  inr,
  modeLabel,
} from "@/app/components/fees/ui";

/** Fetches `/api/fees/slip` (optionally for a student) and renders it. */
export function useStatement(studentId?: string) {
  const [data, setData] = useState<StudentStatement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const qs = studentId ? `?studentId=${encodeURIComponent(studentId)}` : "";
    fetch(`/api/fees/slip${qs}`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? "Could not load fees");
        return body as StudentStatement;
      })
      .then((d) => !cancelled && setData(d))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Could not load fees"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [studentId]);

  return { data, error, loading };
}

export function FeeStatementView({
  statement,
  receiptHref,
  emptyAction,
}: {
  statement: StudentStatement;
  receiptHref: (receiptId: string) => string;
  emptyAction?: ReactNode;
}) {
  const { summary, accounts } = statement;
  const receipts = accounts
    .flatMap((a) => a.receipts.map((r) => ({ ...r, structureName: a.structureName, className: a.className })))
    .sort((a, b) => b.paymentDate.localeCompare(a.paymentDate));

  // Group accounts by academic session, current session first.
  const sessions = new Map<string, { name: string; isActive: boolean; rows: typeof accounts }>();
  for (const a of accounts) {
    const key = a.session?.id ?? "none";
    const entry = sessions.get(key) ?? { name: a.session?.name ?? "Other", isActive: !!a.session?.isActive, rows: [] };
    entry.rows.push(a);
    sessions.set(key, entry);
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatTile label="Total payable" value={inr(summary.totalPayable)} icon={<Landmark className="h-4 w-4" />} tone="slate"
          hint={summary.totalDiscount > 0 ? `after ${inr(summary.totalDiscount)} concession` : undefined} />
        <StatTile label="Paid" value={inr(summary.totalPaid)} icon={<CheckCircle2 className="h-4 w-4" />} tone="green"
          hint={`${summary.receiptCount} receipt${summary.receiptCount === 1 ? "" : "s"}`} />
        <StatTile label="Balance due" value={inr(summary.totalRemaining)} icon={<Wallet className="h-4 w-4" />}
          tone={summary.totalRemaining > 0 ? "amber" : "green"} />
        <StatTile label="Overdue" value={inr(summary.overdue)} icon={<AlertTriangle className="h-4 w-4" />}
          tone={summary.overdue > 0 ? "red" : "slate"} hint={summary.overdue > 0 ? "past the due date" : "nothing overdue"} />
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white">
          <EmptyState icon={<Wallet className="h-10 w-10" />} title="No fees assigned yet">
            Fees appear here once a fee structure is set up for the class.
            {emptyAction ? <div className="mt-4">{emptyAction}</div> : null}
          </EmptyState>
        </div>
      ) : (
        [...sessions.entries()].map(([key, s]) => (
          <section key={key} className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <header className="flex items-center justify-between border-b border-gray-100 bg-gray-50/60 px-5 py-3">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-gray-900">{s.name}</h3>
                {s.isActive ? (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">Current</span>
                ) : null}
              </div>
              <p className="text-sm text-gray-500">
                Balance{" "}
                <span className="font-semibold tabular-nums text-gray-900">
                  {inr(s.rows.reduce((sum, r) => sum + r.balance.remainAmount, 0))}
                </span>
              </p>
            </header>
            <ul className="divide-y divide-gray-100">
              {s.rows.map((a) => (
                <li key={a.accountId} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-gray-900">{a.structureName}</p>
                      <FeeStatusBadge status={a.isOverdue ? "OVERDUE" : a.balance.status} />
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {a.className}
                      {a.dueDate ? ` · due ${fmtDate(a.dueDate)}` : ""}
                      {a.breakdown.tuition > 0 ? ` · tuition ${inr(a.breakdown.tuition)}` : ""}
                      {a.breakdown.exam > 0 ? ` · exam ${inr(a.breakdown.exam)}` : ""}
                      {a.breakdown.misc > 0 ? ` · misc ${inr(a.breakdown.misc)}` : ""}
                      {a.breakdown.transport > 0
                        ? a.includesTransport
                          ? ` · transport ${inr(a.breakdown.transport)}`
                          : " · transport not charged"
                        : ""}
                    </p>
                    <PaidBar className="mt-2 max-w-sm" paid={a.balance.amountPaid} payable={a.balance.netPayable} />
                  </div>
                  <dl className="grid grid-cols-3 gap-6 text-right text-sm tabular-nums">
                    <div>
                      <dt className="text-xs text-gray-500">Payable</dt>
                      <dd className="font-medium text-gray-900">{inr(a.balance.netPayable)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Paid</dt>
                      <dd className="font-medium text-emerald-700">{inr(a.balance.amountPaid)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-gray-500">Balance</dt>
                      <dd className={a.balance.remainAmount > 0 ? "font-semibold text-gray-900" : "font-medium text-emerald-700"}>
                        {inr(a.balance.remainAmount)}
                      </dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <header className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
          <Receipt className="h-4 w-4 text-gray-400" />
          <h3 className="font-semibold text-gray-900">Receipts</h3>
        </header>
        {receipts.length === 0 ? (
          <EmptyState title="No payments yet" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/60 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-2.5 font-medium">Receipt</th>
                  <th className="px-5 py-2.5 font-medium">Date</th>
                  <th className="px-5 py-2.5 font-medium">Fee</th>
                  <th className="px-5 py-2.5 font-medium">Mode</th>
                  <th className="px-5 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {receipts.map((r) => (
                  <tr key={r.id} className={r.voided ? "text-gray-400" : undefined}>
                    <td className="px-5 py-3 font-mono text-xs">
                      {r.receiptNo}
                      {r.voided ? <FeeStatusBadge status="VOID" className="ml-2" /> : null}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">{fmtDate(r.paymentDate)}</td>
                    <td className="px-5 py-3">
                      {r.structureName}
                      <span className="text-gray-400"> · {r.className}</span>
                    </td>
                    <td className="px-5 py-3">{modeLabel(r.paymentMode)}</td>
                    <td className="px-5 py-3 text-right font-medium tabular-nums">
                      {inr(r.amount)}
                      {r.discount > 0 ? <div className="text-xs font-normal text-gray-500">+ {inr(r.discount)} concession</div> : null}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link href={receiptHref(r.id)} className="text-sm font-medium text-blue-600 hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
