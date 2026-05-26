"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/app/components/ui/button";
import { Card, CardContent } from "@/app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Badge } from "@/app/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { Pencil, Plus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import Pagination from "@/app/components/Pagination";

interface Structure {
  id: string;
  name: string | null;
  examFee: number | null;
  transportFee: number | null;
  miscFee: number | null;
  total: number;
  monthlyFee: number | null;
  totalMonths: number;
  isOptional: boolean;
  class: { name: string } | null;
}

const PAGE_SIZE = 10;

export default function FeeStructuresPage() {
  const router = useRouter();
  const [structures, setStructures] = useState<Structure[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);

  const totalPages = Math.ceil(structures.length / PAGE_SIZE);
  const paginated = structures.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    fetch("/api/fees/structures")
      .then((res) => res.json())
      .then((data) => setStructures(Array.isArray(data) ? data : []))
      .catch(() => toast.error("Failed to load structures"))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: string) => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/fees/structures/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setStructures((prev) => prev.filter((s) => s.id !== id));
      toast.success("Fee structure deleted");
      setDeleteId(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Fee Structures</h1>
        <Link href="/admin/fees/structures/new">
          <Button><Plus className="h-4 w-4 mr-2" />New Structure</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Exam</TableHead>
                <TableHead>Transport</TableHead>
                <TableHead>Misc</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Monthly</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-gray-500">No fee structures found</TableCell></TableRow>
              ) : (
                paginated.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.name || "Untitled"}</TableCell>
                    <TableCell>{s.class?.name || "-"}</TableCell>
                    <TableCell>₹{Number(s.examFee || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      {s.transportFee ? (
                        <Badge variant="outline">₹{Number(s.transportFee).toLocaleString()}</Badge>
                      ) : "-"}
                    </TableCell>
                    <TableCell>₹{Number(s.miscFee || 0).toLocaleString()}</TableCell>
                    <TableCell className="font-bold">₹{Number(s.total).toLocaleString()}</TableCell>
                    <TableCell>
                      {s.monthlyFee ? `₹${Number(s.monthlyFee).toLocaleString()}/mo` : "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Link href={`/admin/fees/structures/${s.id}/edit`}>
                          <Button variant="outline" size="sm"><Pencil className="h-4 w-4" /></Button>
                        </Link>
                        <Dialog open={deleteId === s.id} onOpenChange={(open) => setDeleteId(open ? s.id : null)}>
                          <DialogTrigger asChild>
                            <Button variant="destructive" size="sm"><Trash2 className="h-4 w-4" /></Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Delete Structure</DialogTitle>
                              <DialogDescription>Delete &ldquo;{s.name}&rdquo; and all associated payment records?</DialogDescription>
                            </DialogHeader>
                            <DialogFooter>
                              <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
                              <Button variant="destructive" onClick={() => handleDelete(s.id)} disabled={deleting}>
                                {deleting ? "Deleting..." : "Delete"}
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={structures.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  );
}
