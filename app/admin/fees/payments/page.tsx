"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Download, HandCoins, Receipt, Search } from "lucide-react";
import type { TransactionRow } from "@/lib/fees/service";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Checkbox } from "@/app/components/ui/checkbox";
import Pagination from "@/app/components/Pagination";
import { VoidReceiptDialog } from "@/app/components/fees/VoidReceiptDialog";
import {
  EmptyState,
  FeeStatusBadge,
  PAYMENT_MODES,
  PageHeader,
  downloadCsv,
  fmtDate,
  inr,
  modeLabel,
} from "@/app/components/fees/ui";

interface ListResponse {
  items: TransactionRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  totals: { amount: number; discount: number };
}

const PAGE_SIZE = 20;

export default function FeeReceiptsPage() {
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [classId, setClassId] = useState("all");
  const [mode, setMode] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [includeVoided, setIncludeVoided] = useState(false);
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((res) => setClasses(Array.isArray(res?.data) ? res.data : []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Any filter change goes back to page 1.
  useEffect(() => setPage(1), [debouncedQ, classId, mode, from, to, includeVoided]);

  const buildParams = useCallback(
    (p: number, size: number) => {
      const params = new URLSearchParams({ page: String(p), pageSize: String(size) });
      if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
      if (classId !== "all") params.set("classId", classId);
      if (mode !== "all") params.set("mode", mode);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (includeVoided) params.set("includeVoided", "true");
      return params;
    },
    [debouncedQ, classId, mode, from, to, includeVoided]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/fees/payments?${buildParams(page, PAGE_SIZE)}`)
      .then(async (r) => {
        const body = await r.json().catch(() => null);
        if (!r.ok) throw new Error(body?.error ?? "Could not load receipts");
        return body as ListResponse;
      })
      .then((d) => !cancelled && setData(d))
      .catch((e: unknown) => !cancelled && toast.error(e instanceof Error ? e.message : "Could not load receipts"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [buildParams, page, version]);

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows: TransactionRow[] = [];
      for (let p = 1; ; p++) {
        const res = await fetch(`/api/fees/payments?${buildParams(p, 100)}`);
        const body = (await res.json()) as ListResponse;
        rows.push(...body.items);
        if (p >= body.totalPages) break;
      }
      downloadCsv(
        `fee-receipts-${new Date().toISOString().slice(0, 10)}`,
        rows.map((r) => ({
          Receipt: r.receiptNo,
          Date: r.paymentDate.slice(0, 10),
          Student: r.student.name,
          "Admission No": r.student.admissionNo,
          Class: r.className,
          Fee: r.structureName,
          Mode: modeLabel(r.paymentMode),
          Reference: r.referenceNo,
          Amount: r.amount,
          Concession: r.discount,
          "Late fine": r.lateFine,
          "Collected by": r.collectedBy,
          Status: r.voided ? `VOID: ${r.voidReason ?? ""}` : "OK",
        }))
      );
    } catch {
      toast.error("Export failed");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Fee receipts"
        description="Every payment collected, newest first."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={exporting || !data?.total}>
              <Download className="mr-2 h-4 w-4" /> {exporting ? "Exporting…" : "Export CSV"}
            </Button>
            <Button asChild>
              <Link href="/admin/fees/payments/new">
                <HandCoins className="mr-2 h-4 w-4" /> Collect fee
              </Link>
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input className="pl-9" placeholder="Student, admission or receipt no." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="w-40"><SelectValue placeholder="Class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={mode} onValueChange={setMode}>
          <SelectTrigger className="w-36"><SelectValue placeholder="Mode" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All modes</SelectItem>
            {PAYMENT_MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From date" />
        <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To date" />
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <Checkbox checked={includeVoided} onCheckedChange={(v) => setIncludeVoided(v === true)} /> Show voided
        </label>
      </div>

      {data ? (
        <div className="flex flex-wrap gap-x-8 gap-y-1 text-sm text-gray-600">
          <span><span className="font-semibold tabular-nums text-gray-900">{data.total}</span> receipts</span>
          <span>Collected <span className="font-semibold tabular-nums text-gray-900">{inr(data.totals.amount)}</span></span>
          {data.totals.discount > 0 ? (
            <span>Concessions <span className="font-semibold tabular-nums text-gray-900">{inr(data.totals.discount)}</span></span>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading && !data ? (
          <div className="h-80 animate-pulse bg-gray-50" />
        ) : !data || data.items.length === 0 ? (
          <EmptyState icon={<Receipt className="h-10 w-10" />} title="No receipts found">
            Adjust the filters, or collect a fee to create one.
          </EmptyState>
        ) : (
          <div className={`overflow-x-auto ${loading ? "opacity-60" : ""}`}>
            <table className="w-full text-sm">
              <thead className="bg-gray-50/70 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Receipt</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Fee</th>
                  <th className="px-5 py-3 font-medium">Mode</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.items.map((r) => (
                  <tr key={r.id} className={r.voided ? "bg-gray-50/50 text-gray-400" : "hover:bg-gray-50/60"}>
                    <td className="px-5 py-3">
                      <Link href={`/admin/fees/payments/${r.id}/receipt`} className="font-mono text-xs font-medium text-blue-600 hover:underline">
                        {r.receiptNo}
                      </Link>
                      {r.voided ? <FeeStatusBadge status="VOID" className="ml-2" /> : null}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">{fmtDate(r.paymentDate)}</td>
                    <td className="px-5 py-3">
                      <Link href={`/admin/students/${r.student.id}`} className="font-medium text-gray-900 hover:underline">
                        {r.student.name}
                      </Link>
                      <span className="block text-xs text-gray-500">{r.className} · {r.student.admissionNo}</span>
                    </td>
                    <td className="px-5 py-3">{r.structureName}</td>
                    <td className="px-5 py-3">
                      {modeLabel(r.paymentMode)}
                      {r.referenceNo ? <span className="block text-xs text-gray-500">{r.referenceNo}</span> : null}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums">
                      {inr(r.amount)}
                      {r.discount > 0 ? <span className="block text-xs font-normal text-gray-500">+{inr(r.discount)} concession</span> : null}
                    </td>
                    <td className="px-5 py-3 text-right">
                      {!r.voided ? (
                        <VoidReceiptDialog
                          receiptId={r.id}
                          receiptNo={r.receiptNo}
                          amount={r.amount}
                          onVoided={() => setVersion((v) => v + 1)}
                          trigger={
                            <Button variant="ghost" size="sm" className="text-gray-500 hover:text-red-600">Void</Button>
                          }
                        />
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data ? (
        <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={PAGE_SIZE} onPageChange={setPage} />
      ) : null}
    </div>
  );
}

