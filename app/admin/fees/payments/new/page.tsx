"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Search, UserRound, X } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { checkPayment, computeBalance, type AccountBalance } from "@/lib/fees/calc";
import { money } from "@/lib/money";
import {
  EmptyState,
  FeeStatusBadge,
  PAYMENT_MODES,
  PageHeader,
  PaidBar,
  fmtDate,
  inr,
} from "@/app/components/fees/ui";
import { cn } from "@/app/lib/utils";

interface StudentHit {
  id: string;
  name: string;
  admissionNo: string;
  rollNumber: string;
  className: string;
  active: boolean;
  outstanding: number;
}

interface Account {
  accountId: string;
  structureId: string;
  structureName: string;
  className: string;
  sessionName: string | null;
  dueDate: string | null;
  isOverdue: boolean;
  balance: AccountBalance;
}

interface AccountsResponse {
  student: { id: string; name: string; admissionNo: string; rollNumber: string; className: string; fatherName: string | null; active: boolean };
  accounts: Account[];
}

const today = () => new Date().toISOString().slice(0, 10);

function CollectFee() {
  const router = useRouter();
  const params = useSearchParams();

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<StudentHit[]>([]);
  const [searching, setSearching] = useState(false);

  const [studentId, setStudentId] = useState<string | null>(params.get("studentId"));
  const [data, setData] = useState<AccountsResponse | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);

  const [amount, setAmount] = useState("");
  const [discount, setDiscount] = useState("");
  const [lateFine, setLateFine] = useState("");
  const [mode, setMode] = useState("CASH");
  const [date, setDate] = useState(today());
  const [referenceNo, setReferenceNo] = useState("");
  const [remarks, setRemarks] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Debounced student search.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    setSearching(true);
    const t = setTimeout(() => {
      fetch(`/api/fees/students?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d) => setHits(Array.isArray(d) ? d : []))
        .catch(() => setHits([]))
        .finally(() => setSearching(false));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const loadAccounts = useCallback((id: string) => {
    setLoadingAccounts(true);
    fetch(`/api/fees/accounts?studentId=${id}`)
      .then(async (r) => {
        const body = await r.json().catch(() => null);
        if (!r.ok) throw new Error(body?.error ?? "Could not load fees");
        return body as AccountsResponse;
      })
      .then((d) => {
        setData(d);
        const open = d.accounts.filter((a) => a.balance.remainAmount > 0);
        const pick = open.find((a) => a.isOverdue) ?? open[0] ?? null;
        setAccountId(pick?.accountId ?? null);
        setAmount(pick ? String(pick.balance.remainAmount) : "");
      })
      .catch((e: unknown) => {
        toast.error(e instanceof Error ? e.message : "Could not load fees");
        setData(null);
      })
      .finally(() => setLoadingAccounts(false));
  }, []);

  useEffect(() => {
    if (studentId) loadAccounts(studentId);
  }, [studentId, loadAccounts]);

  const account = data?.accounts.find((a) => a.accountId === accountId) ?? null;

  const preview = useMemo(() => {
    if (!account) return null;
    const tx = { amount: Number(amount) || 0, discount: Number(discount) || 0, lateFine: Number(lateFine) || 0 };
    const check = checkPayment(account.balance, tx);
    // Balance after = current balance with one more transaction folded in.
    const after = computeBalance(account.balance.totalDue, [
      { amount: account.balance.amountPaid, discount: account.balance.discount, lateFine: account.balance.lateFine },
      tx,
    ]);
    return { check, after };
  }, [account, amount, discount, lateFine]);

  const chooseStudent = (id: string) => {
    setStudentId(id);
    setQuery("");
    setHits([]);
    router.replace(`/admin/fees/payments/new?studentId=${id}`, { scroll: false });
  };

  const reset = () => {
    setStudentId(null);
    setData(null);
    setAccountId(null);
    setAmount("");
    setDiscount("");
    setLateFine("");
    setReferenceNo("");
    setRemarks("");
    router.replace("/admin/fees/payments/new", { scroll: false });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!data || !account || !preview?.check.ok) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/fees/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: data.student.id,
          feeStructureId: account.structureId,
          amount,
          discount,
          lateFine,
          paymentMode: mode,
          paymentDate: date,
          referenceNo,
          remarks,
        }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not record the payment");
      toast.success(`Receipt ${body.receiptNo} created`);
      router.push(`/admin/fees/payments/${body.id}/receipt`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not record the payment");
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader title="Collect fee" description="Find the student, pick the fee, take the payment. A receipt is generated instantly." />

      {/* Step 1: student */}
      {!studentId ? (
        <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <Label htmlFor="student-search">Student</Label>
          <div className="relative mt-1.5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              id="student-search"
              autoFocus
              className="h-11 pl-9 text-base"
              placeholder="Search by name, admission no. or roll no."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {searching ? <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" /> : null}
          </div>
          {hits.length > 0 ? (
            <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-lg border border-gray-200">
              {hits.map((h) => (
                <li key={h.id}>
                  <button type="button" onClick={() => chooseStudent(h.id)}
                    className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-blue-50/60 focus:bg-blue-50/60 focus:outline-none">
                    <span>
                      <span className="font-medium text-gray-900">{h.name}</span>
                      {!h.active ? <span className="ml-2 text-xs text-gray-400">(inactive)</span> : null}
                      <span className="block text-xs text-gray-500">
                        {h.className || "No class"} · Adm {h.admissionNo} · Roll {h.rollNumber}
                      </span>
                    </span>
                    <span className={cn("text-sm tabular-nums", h.outstanding > 0 ? "font-semibold text-gray-900" : "text-emerald-600")}>
                      {h.outstanding > 0 ? `${inr(h.outstanding)} due` : "No dues"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : query.trim().length >= 2 && !searching ? (
            <p className="mt-3 text-sm text-gray-500">No students match “{query}”.</p>
          ) : null}
        </section>
      ) : loadingAccounts || !data ? (
        <div className="h-72 animate-pulse rounded-xl bg-white" />
      ) : (
        <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="space-y-6">
            {/* Student card */}
            <section className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <span className="rounded-full bg-blue-50 p-2.5 text-blue-600"><UserRound className="h-5 w-5" /></span>
                <div>
                  <p className="font-semibold text-gray-900">{data.student.name}</p>
                  <p className="text-xs text-gray-500">
                    {data.student.className || "No class"} · Adm {data.student.admissionNo} · Roll {data.student.rollNumber}
                    {data.student.fatherName ? ` · S/o ${data.student.fatherName}` : ""}
                  </p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={reset}>
                <X className="mr-1 h-4 w-4" /> Change
              </Button>
            </section>

            {/* Step 2: fee account */}
            <section className="rounded-xl border border-gray-200 bg-white shadow-sm">
              <h2 className="border-b border-gray-100 px-5 py-3 font-semibold text-gray-900">Fee</h2>
              {data.accounts.length === 0 ? (
                <EmptyState title="No fees assigned to this student">
                  Create a fee structure for {data.student.className || "their class"} first.
                </EmptyState>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {data.accounts.map((a) => {
                    const selected = a.accountId === accountId;
                    const settled = a.balance.remainAmount <= 0;
                    return (
                      <li key={a.accountId}>
                        <label className={cn("flex cursor-pointer items-center gap-4 px-5 py-4", selected ? "bg-blue-50/60" : "hover:bg-gray-50", settled && "cursor-default opacity-60")}>
                          <input type="radio" name="account" className="h-4 w-4 accent-blue-600" checked={selected} disabled={settled}
                            onChange={() => { setAccountId(a.accountId); setAmount(String(a.balance.remainAmount)); }} />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-gray-900">{a.structureName}</span>
                              <FeeStatusBadge status={a.isOverdue ? "OVERDUE" : a.balance.status} />
                            </div>
                            <p className="mt-0.5 text-xs text-gray-500">
                              {[a.className, a.sessionName, a.dueDate ? `due ${fmtDate(a.dueDate)}` : null].filter(Boolean).join(" · ")}
                            </p>
                            <PaidBar className="mt-2 max-w-xs" paid={a.balance.amountPaid} payable={a.balance.netPayable} />
                          </div>
                          <div className="text-right text-sm tabular-nums">
                            <p className="font-semibold text-gray-900">{inr(a.balance.remainAmount)}</p>
                            <p className="text-xs text-gray-500">of {inr(a.balance.netPayable)}</p>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Step 3: payment */}
            {account ? (
              <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="font-semibold text-gray-900">Payment</h2>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5 md:col-span-2">
                    <Label htmlFor="amount">Amount received</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">₹</span>
                        <Input id="amount" type="number" inputMode="decimal" min={0} step="0.01" className="h-11 pl-7 text-lg font-semibold tabular-nums"
                          value={amount} onChange={(e) => setAmount(e.target.value)} />
                      </div>
                      <Button type="button" variant="outline" className="h-11"
                        onClick={() => setAmount(String(money(account.balance.remainAmount + (Number(lateFine) || 0) - (Number(discount) || 0))))}>
                        Full balance
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="discount">Concession</Label>
                    <Input id="discount" type="number" min={0} step="0.01" placeholder="0" value={discount} onChange={(e) => setDiscount(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lateFine">Late fine</Label>
                    <Input id="lateFine" type="number" min={0} step="0.01" placeholder="0" value={lateFine} onChange={(e) => setLateFine(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="mode">Mode</Label>
                    <Select value={mode} onValueChange={setMode}>
                      <SelectTrigger id="mode"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {PAYMENT_MODES.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="date">Date</Label>
                    <Input id="date" type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} />
                  </div>
                  {mode !== "CASH" ? (
                    <div className="space-y-1.5">
                      <Label htmlFor="ref">{mode === "CHEQUE" ? "Cheque no." : "Transaction / UTR no."}</Label>
                      <Input id="ref" value={referenceNo} onChange={(e) => setReferenceNo(e.target.value)} />
                    </div>
                  ) : null}
                  <div className={cn("space-y-1.5", mode === "CASH" && "md:col-span-2")}>
                    <Label htmlFor="remarks">Remarks</Label>
                    <Input id="remarks" placeholder="Optional" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
                  </div>
                </div>
              </section>
            ) : null}
          </div>

          {/* Summary */}
          <aside className="h-fit space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
            <h3 className="text-sm font-semibold text-gray-900">Summary</h3>
            {account && preview ? (
              <>
                <dl className="space-y-2 text-sm tabular-nums">
                  <Line label="Balance now" value={inr(account.balance.remainAmount)} />
                  {Number(lateFine) > 0 ? <Line label="+ Late fine" value={inr(Number(lateFine))} /> : null}
                  {Number(discount) > 0 ? <Line label="− Concession" value={inr(Number(discount))} /> : null}
                  <Line label="− Received" value={inr(Number(amount) || 0)} />
                </dl>
                <div className="border-t border-gray-200 pt-3">
                  <Line label="Balance after" value={inr(preview.after.remainAmount)} strong />
                  <div className="mt-2"><FeeStatusBadge status={preview.after.status} /></div>
                </div>
                {!preview.check.ok ? (
                  <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{preview.check.error}</p>
                ) : null}
                <Button type="submit" className="h-11 w-full" disabled={submitting || !preview.check.ok}>
                  {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  {submitting ? "Recording…" : `Record ${inr(Number(amount) || 0)}`}
                </Button>
              </>
            ) : (
              <p className="text-sm text-gray-500">
                {data.accounts.some((a) => a.balance.remainAmount > 0) ? "Choose a fee to continue." : "All fees are fully paid."}
              </p>
            )}
          </aside>
        </form>
      )}
    </div>
  );
}

function Line({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={strong ? "font-medium text-gray-900" : "text-gray-500"}>{label}</dt>
      <dd className={strong ? "text-lg font-semibold text-gray-900" : "text-gray-800"}>{value}</dd>
    </div>
  );
}

export default function NewFeePaymentPage() {
  return (
    <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-white" />}>
      <CollectFee />
    </Suspense>
  );
}
