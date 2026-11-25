"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/app/components/ui/table";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import { KeyRound, Loader2, Download, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usePDF } from "@/app/lib/usePDF";
import { ClassStudentListPDF } from "@/app/components/PDFTemplates";
import Link from "next/link";
import DeleteDialog from "@/app/components/DeleteDialog";
import Pagination from "@/app/components/Pagination";

export interface Student {
  id: string;
  profileImg: string | null;
  user: { name: string; email: string };
  admissionNo: string;
  rollNumber: string;
  class: { name: string } | null;
  active: boolean;
}

const PAGE_SIZE = 15;

export default function StudentsTable({ students }: { students: Student[] }) {
  const [query, setQuery] = useState("");
  const [selectedClass, setSelectedClass] = useState("all");
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [openDialogId, setOpenDialogId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteName, setDeleteName] = useState("");
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();
  const classListPdf = usePDF("Student_List.pdf");

  const handleResetPassword = async (studentId: string, studentName: string) => {
    setResettingId(studentId);
    try {
      const res = await fetch(`/api/students/${studentId}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to reset password");
      }

      const data = await res.json();
      setResetPassword(data.defaultPassword);
      toast.success(`Password reset successfully for ${studentName}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password");
      setOpenDialogId(null);
    } finally {
      setResettingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/students/${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      toast.success("Student deleted");
      setDeleteId(null);
      router.refresh();
    } catch {
      toast.error("Failed to delete student");
    } finally {
      setDeleting(false);
    }
  };

  const classList = useMemo(() => {
    const unique = Array.from(
      new Set(students.map((s) => s.class?.name).filter(Boolean))
    );
    return ["all", ...unique];
  }, [students]);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch = [s.user?.name, s.user?.email, s.admissionNo, s.rollNumber, s.class?.name]
        .some((val) => val?.toLowerCase().includes(query.toLowerCase()));

      const matchesClass =
        selectedClass === "all" || s.class?.name === selectedClass;

      return matchesSearch && matchesClass;
    });
  }, [students, query, selectedClass]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="space-y-6">
      {/* Hidden PDF content */}
      <div className="hidden"><div ref={classListPdf.ref}>
        <ClassStudentListPDF
          className={selectedClass === "all" ? "All Classes" : selectedClass}
          session={""}
          students={filtered.map((s, i) => ({ sNo: i + 1, name: s.user?.name ?? "—", admissionNo: s.admissionNo, rollNumber: s.rollNumber }))}
          total={filtered.length}
        />
      </div></div>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex gap-3">
          <Input
            placeholder="Search students..."
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            className="w-64"
          />
          <Select value={selectedClass} onValueChange={(v) => { setSelectedClass(v); setPage(1); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select Class" />
            </SelectTrigger>
            <SelectContent>
              {classList.map((cls) => (
                <SelectItem key={cls} value={cls ?? ""}>
                  {cls === "all" ? "All Classes" : cls}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={classListPdf.generatePDF} disabled={classListPdf.loading}>
            <Download className="h-4 w-4 mr-1" />
            {classListPdf.loading ? "..." : "PDF"}
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          {filtered.length} result{filtered.length !== 1 && "s"} found
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow>
              <TableHead>Profile</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Admission No</TableHead>
              <TableHead>Roll No</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-gray-500">
                  No students found
                </TableCell>
              </TableRow>
            ) : (
              paginated.map((s) => (
                <TableRow
                  key={s.id}
                  className="cursor-pointer"
                  onClick={() => router.push(`/admin/students/${s.id}`)}
                >
                  <TableCell>
                    {s.profileImg ? (
                      <Image
                        src={s.profileImg}
                        alt={s.user?.name ?? ""}
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-xs text-gray-500">
                        N/A
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{s.user?.name ?? "—"}</TableCell>
                  <TableCell>{s.user?.email ?? "—"}</TableCell>
                  <TableCell>{s.admissionNo}</TableCell>
                  <TableCell>{s.rollNumber}</TableCell>
                  <TableCell>
                    {s.class?.name ? (
                      <Badge variant="secondary">{s.class.name}</Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.active ? "default" : "destructive"}>
                      {s.active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/students/${s.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => { setDeleteId(s.id); setDeleteName(s.user?.name ?? s.admissionNo); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Dialog
                        open={openDialogId === s.id}
                        onOpenChange={(open) => {
                          setOpenDialogId(open ? s.id : null);
                          if (!open) setResetPassword(null);
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenDialogId(s.id);
                            }}
                          >
                            <KeyRound className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reset Password</DialogTitle>
                            <DialogDescription>
                              Are you sure you want to reset the password for {s.user?.name ?? s.admissionNo}?
                              {resetPassword && (
                                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                                  <p className="text-sm font-semibold text-green-800 mb-1">New Password:</p>
                                  <p className="text-lg font-mono text-green-900 bg-white p-2 rounded border">{resetPassword}</p>
                                  <p className="text-xs text-green-700 mt-2">Please share this password with the student securely.</p>
                                </div>
                              )}
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            {resetPassword ? (
                              <Button onClick={() => { setOpenDialogId(null); setResetPassword(null); }}>Close</Button>
                            ) : (
                              <>
                                <Button variant="outline" onClick={() => setOpenDialogId(null)}>Cancel</Button>
                                <Button onClick={() => handleResetPassword(s.id, s.user?.name ?? s.admissionNo)} disabled={resettingId === s.id}>
                                  {resettingId === s.id ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Resetting...</> : "Reset Password"}
                                </Button>
                              </>
                            )}
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
      </div>

      <Pagination
        page={page}
        totalPages={totalPages}
        total={filtered.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      <DeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={handleDelete}
        loading={deleting}
        title="Delete Student"
        entityName={deleteName}
      />
    </div>
  );
}
