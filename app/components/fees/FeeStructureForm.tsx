"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bus, Info } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { structureBreakdown } from "@/lib/fees/calc";
import { inr } from "@/app/components/fees/ui";

export interface FeeStructureFormValues {
  classId: string;
  categoryId: string;
  name: string;
  dueDate: string;
  monthlyFee: string;
  totalMonths: string;
  examFee: string;
  miscFee: string;
  transportFee: string;
}

export const EMPTY_STRUCTURE: FeeStructureFormValues = {
  classId: "",
  categoryId: "",
  name: "",
  dueDate: "",
  monthlyFee: "",
  totalMonths: "12",
  examFee: "",
  miscFee: "",
  transportFee: "",
};

type Option = { id: string; name: string };

export function FeeStructureForm({
  structureId,
  initial = EMPTY_STRUCTURE,
}: {
  /** Present when editing. */
  structureId?: string;
  initial?: FeeStructureFormValues;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FeeStructureFormValues>(initial);
  const [classes, setClasses] = useState<Option[]>([]);
  const [categories, setCategories] = useState<Option[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setForm(initial), [initial]);

  useEffect(() => {
    fetch("/api/classes")
      .then((r) => r.json())
      .then((res) => setClasses(Array.isArray(res?.data) ? res.data : []))
      .catch(() => toast.error("Could not load classes"));
    fetch("/api/fees/categories")
      .then((r) => r.json())
      .then((res) => setCategories(Array.isArray(res) ? res : []))
      .catch(() => undefined);
  }, []);

  const set = (key: keyof FeeStructureFormValues) => (value: string) => setForm((f) => ({ ...f, [key]: value }));

  const breakdown = useMemo(
    () =>
      structureBreakdown({
        monthlyFee: Number(form.monthlyFee) || 0,
        totalMonths: Number(form.totalMonths) || 12,
        examFee: Number(form.examFee) || 0,
        miscFee: Number(form.miscFee) || 0,
        transportFee: Number(form.transportFee) || 0,
      }),
    [form]
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.classId) return setError("Choose a class");
    if (breakdown.total <= 0) return setError("Enter at least one fee amount");

    setSubmitting(true);
    try {
      const res = await fetch(structureId ? `/api/fees/structures/${structureId}` : "/api/fees/structures", {
        method: structureId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, categoryId: form.categoryId || undefined }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not save the fee structure");
      toast.success(
        `${structureId ? "Fee structure updated" : "Fee structure created"} · ${body?.studentsBilled ?? 0} student account(s) up to date`
      );
      router.push("/admin/fees/structures");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the fee structure");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        <Section title="Basics">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Class" htmlFor="classId" required>
              <Select value={form.classId} onValueChange={set("classId")}>
                <SelectTrigger id="classId"><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Name" htmlFor="name" hint="Shown on receipts, e.g. “Annual Fee 2026-27”">
              <Input id="name" value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder="Annual Fee" />
            </Field>
            <Field label="Category" htmlFor="categoryId">
              <Select value={form.categoryId || "none"} onValueChange={(v) => set("categoryId")(v === "none" ? "" : v)}>
                <SelectTrigger id="categoryId"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Due date" htmlFor="dueDate" hint="Used for overdue tracking and reminders">
              <Input id="dueDate" type="date" value={form.dueDate} onChange={(e) => set("dueDate")(e.target.value)} />
            </Field>
          </div>
        </Section>

        <Section title="Amounts" description="Leave anything that does not apply empty.">
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Monthly tuition" htmlFor="monthlyFee">
              <Money id="monthlyFee" value={form.monthlyFee} onChange={set("monthlyFee")} placeholder="450" />
            </Field>
            <Field label="Months billed" htmlFor="totalMonths">
              <Input id="totalMonths" type="number" min={1} max={24} value={form.totalMonths}
                onChange={(e) => set("totalMonths")(e.target.value)} disabled={!Number(form.monthlyFee)} />
            </Field>
            <Field label="Exam fee" htmlFor="examFee">
              <Money id="examFee" value={form.examFee} onChange={set("examFee")} />
            </Field>
            <Field label="Miscellaneous" htmlFor="miscFee">
              <Money id="miscFee" value={form.miscFee} onChange={set("miscFee")} />
            </Field>
            <Field label="Transport fee" htmlFor="transportFee" hint="Charged only to students who use school transport">
              <Money id="transportFee" value={form.transportFee} onChange={set("transportFee")} />
            </Field>
          </div>
        </Section>

        {error ? <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button asChild variant="outline" type="button">
            <Link href="/admin/fees/structures">Cancel</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving…" : structureId ? "Save changes" : "Create & bill students"}
          </Button>
        </div>
      </div>

      <aside className="h-fit space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
        <h3 className="text-sm font-semibold text-gray-900">Per student</h3>
        <dl className="space-y-2 text-sm tabular-nums">
          {breakdown.tuition > 0 ? (
            <Row label={`Tuition (${inr(Number(form.monthlyFee))} × ${Number(form.totalMonths) || 12})`} value={inr(breakdown.tuition)} />
          ) : null}
          {breakdown.exam > 0 ? <Row label="Exam" value={inr(breakdown.exam)} /> : null}
          {breakdown.misc > 0 ? <Row label="Miscellaneous" value={inr(breakdown.misc)} /> : null}
          {breakdown.transport > 0 ? <Row label="Transport" value={inr(breakdown.transport)} /> : null}
        </dl>
        <div className="space-y-1 border-t border-gray-200 pt-3">
          <Row label="With transport" value={inr(breakdown.total)} strong />
          {breakdown.transport > 0 ? (
            <Row label="Without transport" value={inr(breakdown.total - breakdown.transport)} strong />
          ) : null}
        </div>
        <p className="flex gap-2 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {structureId
            ? "Saving recalculates every student's balance on this structure. Payments already collected are kept."
            : "Every active student in the class is billed immediately; students who join later are billed automatically."}
        </p>
        {breakdown.transport > 0 ? (
          <p className="flex gap-2 text-xs text-gray-500">
            <Bus className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Transport follows each student&apos;s transport setting.
          </p>
        ) : null}
      </aside>
    </form>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="font-semibold text-gray-900">{title}</h2>
      {description ? <p className="mt-0.5 text-sm text-gray-500">{description}</p> : null}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
    </div>
  );
}

function Money({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm text-gray-400">₹</span>
      <Input id={id} type="number" inputMode="decimal" min={0} step="0.01" className="pl-7" value={value}
        onChange={(e) => onChange(e.target.value)} placeholder={placeholder ?? "0"} />
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={strong ? "font-medium text-gray-900" : "text-gray-500"}>{label}</dt>
      <dd className={strong ? "font-semibold text-gray-900" : "text-gray-700"}>{value}</dd>
    </div>
  );
}
