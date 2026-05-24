"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Loader2, CheckCircle2, XCircle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DeleteDialog from "@/app/components/DeleteDialog";

interface Leave {
  id: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  staff: {
    user: { name: string; email: string };
    designation: string;
  } | null;
  student: {
    user: { name: string; email: string };
    class?: { name: string };
  } | null;
}

export default function AdminLeavesPage() {
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchLeaves = async () => {
    try {
      const res = await fetch("/api/leaves");
      const json = await res.json();
      setLeaves(Array.isArray(json.data) ? json.data : []);
    } catch {
      toast.error("Failed to load leaves");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeaves(); }, []);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/leaves/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Leave deleted");
      setDeleteId(null);
      fetchLeaves();
    } catch {
      toast.error("Failed to delete");
    } finally {
      setDeleting(false);
    }
  };

  const handleStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/leaves/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Leave ${status.toLowerCase()}`);
      fetchLeaves();
    } catch {
      toast.error("Failed to update status");
    }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  const pending = leaves.filter((l) => l.status === "PENDING");
  const history = leaves.filter((l) => l.status !== "PENDING");

  const getApplicantName = (l: Leave) => {
    if (l.staff) return l.staff.user.name;
    if (l.student) return l.student.user.name;
    return "Unknown";
  };

  const getApplicantType = (l: Leave) => {
    if (l.staff) return "Staff";
    if (l.student) return "Student";
    return "Unknown";
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Leave Management</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Total Requests</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{leaves.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Pending</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-yellow-600">{pending.length}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Approved</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{leaves.filter((l) => l.status === "APPROVED").length}</div></CardContent>
        </Card>
      </div>

      {pending.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Pending Requests</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant</TableHead><TableHead>Type</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Reason</TableHead><TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{getApplicantName(l)}</TableCell>
                    <TableCell><Badge variant="outline">{getApplicantType(l)}</Badge></TableCell>
                    <TableCell>{new Date(l.fromDate).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(l.toDate).toLocaleDateString()}</TableCell>
                    <TableCell className="max-w-xs truncate">{l.reason}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" className="bg-green-600" onClick={() => handleStatus(l.id, "APPROVED")}>
                          <CheckCircle2 className="h-4 w-4 mr-1" />Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleStatus(l.id, "REJECTED")}>
                          <XCircle className="h-4 w-4 mr-1" />Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Leave History</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Applicant</TableHead><TableHead>Type</TableHead><TableHead>From</TableHead><TableHead>To</TableHead><TableHead>Reason</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {history.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-gray-500">No leave history</TableCell></TableRow>
              ) : (
                history.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{getApplicantName(l)}</TableCell>
                    <TableCell><Badge variant="outline">{getApplicantType(l)}</Badge></TableCell>
                    <TableCell>{new Date(l.fromDate).toLocaleDateString()}</TableCell>
                    <TableCell>{new Date(l.toDate).toLocaleDateString()}</TableCell>
                    <TableCell className="max-w-xs truncate">{l.reason}</TableCell>
                    <TableCell>
                      <Badge variant={l.status === "APPROVED" ? "default" : "destructive"}>{l.status}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="destructive" size="sm" onClick={() => setDeleteId(l.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Leave"
      />
    </div>
  );
}
