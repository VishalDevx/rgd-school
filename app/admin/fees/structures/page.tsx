"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Layers, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { structureBreakdown } from "@/lib/fees/calc";
import { EmptyState, PageHeader, fmtDate, inr } from "@/app/components/fees/ui";

interface Structure {
  id: string;
  name: string | null;
  examFee: number | null;
  transportFee: number | null;
  miscFee: number | null;
  monthlyFee: number | null;
  totalMonths: number | null;
  dueDate: string | null;
  class: { id: string; name: string } | null;
  category?: { name: string } | null;
  _count?: { payments: number };
}

export default function FeeStructuresPage() {
  const [structures, setStructures] = useState<Structure[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [toDelete, setToDelete] = useState<Structure | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetch("/api/fees/structures")
      .then((res) => res.json())
      .then((data) => setStructures(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Could not load fee structures"))
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return structures.filter(
      (s) => !q || (s.name ?? "").toLowerCase().includes(q) || (s.class?.name ?? "").toLowerCase().includes(q)
    );
  }, [structures, query]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/fees/structures/${toDelete.id}`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "Could not delete");
      setStructures((prev) => prev.filter((s) => s.id !== toDelete.id));
      toast.success("Fee structure deleted");
      setToDelete(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Fee structures"
        description="What each class is charged. Editing a structure re-bills its students automatically."
        actions={
          <Button asChild>
            <Link href="/admin/fees/structures/new">
              <Plus className="mr-2 h-4 w-4" /> New structure
            </Link>
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input className="pl-9" placeholder="Search by name or class" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {loading ? (
          <div className="h-64 animate-pulse bg-gray-50" />
        ) : visible.length === 0 ? (
          <EmptyState icon={<Layers className="h-10 w-10" />} title={structures.length ? "No matches" : "No fee structures yet"}>
            {structures.length ? "Try a different search." : "Create one to start billing a class."}
          </EmptyState>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50/70 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Structure</th>
                  <th className="px-5 py-3 font-medium">Class</th>
                  <th className="px-5 py-3 font-medium">Components</th>
                  <th className="px-5 py-3 text-right font-medium">Per student</th>
                  <th className="px-5 py-3 font-medium">Due</th>
                  <th className="px-5 py-3 text-right font-medium">Students</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {visible.map((s) => {
                  const b = structureBreakdown(s);
                  return (
                    <tr key={s.id} className="hover:bg-gray-50/60">
                      <td className="px-5 py-3">
                        <p className="font-medium text-gray-900">{s.name || "Untitled"}</p>
                        {s.category?.name ? <p className="text-xs text-gray-500">{s.category.name}</p> : null}
                      </td>
                      <td className="px-5 py-3">{s.class?.name ?? "—"}</td>
                      <td className="px-5 py-3 text-xs text-gray-600">
                        {[
                          b.tuition ? `Tuition ${inr(s.monthlyFee)}×${s.totalMonths ?? 12}` : null,
                          b.exam ? `Exam ${inr(b.exam)}` : null,
                          b.misc ? `Misc ${inr(b.misc)}` : null,
                          b.transport ? `Transport ${inr(b.transport)}` : null,
                        ]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </td>
                      <td className="px-5 py-3 text-right tabular-nums">
                        <span className="font-semibold text-gray-900">{inr(b.total)}</span>
                        {b.transport ? (
                          <span className="block text-xs text-gray-500">{inr(b.total - b.transport)} without transport</span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">{fmtDate(s.dueDate)}</td>
                      <td className="px-5 py-3 text-right tabular-nums">{s._count?.payments ?? 0}</td>
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-1">
                          <Button asChild variant="ghost" size="sm" aria-label="Edit">
                            <Link href={`/admin/fees/structures/${s.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="sm" aria-label="Delete" className="text-red-600 hover:text-red-700"
                            onClick={() => setToDelete(s)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!toDelete} onOpenChange={(open) => !open && setToDelete(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete “{toDelete?.name || "Untitled"}”?</DialogTitle>
            <DialogDescription>
              Students will no longer be billed for it. Structures with payments on record cannot be deleted; void
              those receipts first, or keep the structure for your records.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setToDelete(null)} disabled={deleting}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
