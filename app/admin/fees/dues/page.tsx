"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { BellRing, Download, PartyPopper, Search } from "lucide-react";
import type { DueRow } from "@/lib/fees/service";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { EmptyState, PageHeader, PaidBar, StatTile, downloadCsv, fmtDate, inr } from "@/app/components/fees/ui";

interface DuesResponse {
  items: DueRow[];
  totals: { students: number; remaining: number; overdue: number };
}

export default function FeeDuesPage() {
  const [classes, setClasses] = useState<Array<{ id: string; name: string }>>([]);
  const [classId, setClassId] = useState("all");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [data, setData] = useState<DuesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

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

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = new URLSearchParams();
    if (classId !== "all") params.set("classId", classId);
    if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
    if (overdueOnly) params.set("overdue", "true");
    fetch(`/api/fees/dues?${params}`)
      .then(async (r) => {
        const body = await r.json().catch(() => null);
        if (!r.ok) throw new Error(body?.error ?? "Could not load dues");
        return body as DuesResponse;
      })
      .then((d) => {
        if (cancelled) return;
        setData(d);
        setSelected(new Set());
      })
      .catch((e: unknown) => !cancelled && toast.error(e instanceof Error ? e.message : "Could not load dues"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [classId, debouncedQ, overdueOnly]);

  const items = useMemo(() => data?.items ?? [], [data]);
  const allSelected = items.length > 0 && selected.size === items.length;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const remind = async () => {
    const ids = selected.size ? [...selected] : items.map((i) => i.studentId);
    if (ids.length === 0) return;
    setSending(true);
    try {
      const res = await fetch("/api/fees/dues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentIds: ids }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not send reminders");
      toast.success(`Reminder sent to ${body.sent} student${body.sent === 1 ? "" : "s"}`);
      setSelected(new Set());
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not send reminders");
    } finally {
      setSending(false);
    }
  };

  const exportCsv = () =>
    downloadCsv(
      `fee-dues-${new Date().toISOString().slice(0, 10)}`,
      items.map((i) => ({
        Student: i.name,
        "Admission No": i.admissionNo,
        Roll: i.rollNumber,
        Class: i.className,
        "Father's name": i.fatherName,
        Phone: i.phone,
        Fees: i.structures.join("; "),
        Payable: i.payable,
        Paid: i.paid,
        Balance: i.remaining,
        Overdue: i.overdue,
        "Earliest due": i.oldestDueDate?.slice(0, 10) ?? "",
      }))
    );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Fee dues"
        description="Students with an outstanding balance, most overdue first."
        actions={
          <>
            <Button variant="outline" onClick={exportCsv} disabled={!items.length}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={remind} disabled={sending || !items.length}>
              <BellRing className="mr-2 h-4 w-4" />
              {sending ? "Sending…" : selected.size ? `Remind ${selected.size} selected` : `Remind all ${items.length}`}
            </Button>
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatTile label="Students with dues" value={data?.totals.students ?? "—"} tone="slate" />
        <StatTile label="Outstanding" value={data ? inr(data.totals.remaining) : "—"} tone="amber" />
        <StatTile label="Overdue" value={data ? inr(data.totals.overdue) : "—"} tone="red" hint="past the structure's due date" />
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input className="pl-9" placeholder="Search student or admission no." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={classId} onValueChange={setClassId}>
          <SelectTrigger className="w-44"><SelectValue placeholder="Class" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All classes</SelectItem>
            {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <Checkbox checked={overdueOnly} onCheckedChange={(v) => setOverdueOnly(v === true)} /> Overdue only
        </label>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading && !data ? (
          <div className="h-80 animate-pulse bg-gray-50" />
        ) : items.length === 0 ? (
          <EmptyState icon={<PartyPopper className="h-10 w-10" />} title="No dues">
            Nobody matching these filters owes anything.
          </EmptyState>
        ) : (
          <div className={`overflow-x-auto ${loading ? "opacity-60" : ""}`}>
            <table className="w-full text-sm">
              <thead className="bg-gray-50/70 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="w-10 px-5 py-3">
                    <Checkbox
                      aria-label="Select all"
                      checked={allSelected}
                      onCheckedChange={(v) => setSelected(v === true ? new Set(items.map((i) => i.studentId)) : new Set())}
                    />
                  </th>
                  <th className="px-5 py-3 font-medium">Student</th>
                  <th className="px-5 py-3 font-medium">Fees</th>
                  <th className="px-5 py-3 font-medium">Paid</th>
                  <th className="px-5 py-3 text-right font-medium">Balance</th>
                  <th className="px-5 py-3 text-right font-medium">Overdue</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((i) => (
                  <tr key={i.studentId} className="hover:bg-gray-50/60">
                    <td className="px-5 py-3">
                      <Checkbox aria-label={`Select ${i.name}`} checked={selected.has(i.studentId)} onCheckedChange={() => toggle(i.studentId)} />
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/admin/students/${i.studentId}`} className="font-medium text-gray-900 hover:underline">{i.name}</Link>
                      <span className="block text-xs text-gray-500">
                        {i.className || "No class"} · Adm {i.admissionNo}{i.phone ? ` · ${i.phone}` : ""}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-gray-600">
                      {i.structures.join(", ")}
                      {i.oldestDueDate ? <span className="block text-gray-400">due {fmtDate(i.oldestDueDate)}</span> : null}
                    </td>
                    <td className="w-40 px-5 py-3">
                      <PaidBar paid={i.paid} payable={i.payable} />
                      <span className="mt-1 block text-xs tabular-nums text-gray-500">{inr(i.paid)} of {inr(i.payable)}</span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-gray-900">{inr(i.remaining)}</td>
                    <td className={`px-5 py-3 text-right tabular-nums ${i.overdue > 0 ? "font-semibold text-red-600" : "text-gray-400"}`}>
                      {i.overdue > 0 ? inr(i.overdue) : "—"}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/fees/payments/new?studentId=${i.studentId}`}>Collect</Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
