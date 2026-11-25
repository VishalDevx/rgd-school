"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FeeStructureForm, type FeeStructureFormValues } from "@/app/components/fees/FeeStructureForm";
import { PageHeader } from "@/app/components/fees/ui";

type StructureResponse = {
  classId: string;
  categoryId?: string | null;
  name?: string | null;
  dueDate?: string | null;
  monthlyFee?: number | null;
  totalMonths?: number | null;
  examFee?: number | null;
  miscFee?: number | null;
  transportFee?: number | null;
};

const s = (v: number | string | null | undefined) => (v === null || v === undefined ? "" : String(v));

export default function EditFeeStructurePage() {
  const { id } = useParams<{ id: string }>();
  const [initial, setInitial] = useState<FeeStructureFormValues | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/fees/structures/${id}`)
      .then(async (res) => {
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.error ?? "Fee structure not found");
        return body as StructureResponse;
      })
      .then((d) =>
        setInitial({
          classId: d.classId,
          categoryId: s(d.categoryId),
          name: s(d.name),
          dueDate: d.dueDate ? d.dueDate.slice(0, 10) : "",
          monthlyFee: s(d.monthlyFee),
          totalMonths: s(d.totalMonths ?? 12),
          examFee: s(d.examFee),
          miscFee: s(d.miscFee),
          transportFee: s(d.transportFee),
        })
      )
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Fee structure not found"));
  }, [id]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader title="Edit fee structure" description="Changes re-bill every student on this structure; collected payments are kept." />
      {error ? (
        <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      ) : initial ? (
        <FeeStructureForm structureId={id} initial={initial} />
      ) : (
        <div className="h-96 animate-pulse rounded-xl bg-white" />
      )}
    </div>
  );
}
