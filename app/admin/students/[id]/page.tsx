"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/app/components/ui/tabs";

import { Badge } from "@/app/components/ui/badge";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/app/components/ui/avatar";
import { Button } from "@/app/components/ui/button";
import { LoadingSkeleton } from "@/app/components/LoadingSkeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/app/components/ui/dialog";
import {
  KeyRound, Loader2, Receipt, ToggleLeft, ToggleRight, Upload, FileText, Trash2, ChevronDown, ChevronRight, CheckCircle2, AlertCircle, Clock
} from "lucide-react";
import { toast } from "sonner";
import DeleteStudent from "@/app/components/DeleteStudent";
import DocumentsViewer from "@/app/components/DocumentsViewer";
import { usePDF } from "@/app/lib/usePDF";
import { PDFDownloadButton } from "@/app/components/PDFDownloadButton";

// -----------------------------
// Type Definitions
// -----------------------------
interface StudentData {
  id: string;
  profileImg?: string | null;
  admissionNo: string;
  rollNumber: string;
  dob?: string | null;
  gender?: "MALE" | "FEMALE" | "OTHER" | null;
  address?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  panNo?: string | null;
  apaarId?: string | null;
  fatherAadhar?: string | null;
  motherAadhar?: string | null;
  occupation?: string | null;
  religion?: string | null;
  caste?: string | null;
  udiseCode?: string | null;
  contactNo?: string | null;
  active: boolean;
  admissionDate: string;
  user: {
    name: string;
    email: string;
    adharNo?: string | null;
  };
  class?: { name: string } | null;
  fees: Array<{
    remainAmount: string | number;
    id: string;
    amountPaid: number;
    status: "PAID" | "PENDING" | "PARTIAL";
    paymentDate?: string | null;
    feeStructure?: {
      name: string;
      total: string;
      transportFee: string | null;
      monthlyFee: string | null;
      totalMonths: number;
      class: {
        id: string;
        name: string;
        academicSession: {
          id: string;
          name: string;
          isActive: boolean;
        } | null;
      };
    } | null;
  }>;
  results: Array<{
    id: string;
    marks: number;
    maxMarks: number;
    grade?: string | null;
    remarks?: string | null;
    exam?: { name: string } | null;
    subject?: { name: string } | null;
  }>;
  attendance: Array<{
    id: string;
    date: string;
    status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
  }>;
  usesTransport: boolean;
  transport: Array<{
    id: string;
    routeName: string | null;
    stopName: string | null;
    busNumber: string | null;
    driverName: string | null;
    driverPhone: string | null;
    feeAmount: number | null;
    isActive: boolean;
  }>;
  documents?: Array<{
    id: string;
    type: string;
    title: string;
    fileUrl: string;
    createdAt: string;
  }>;
}

// -----------------------------
// Component
// -----------------------------
export default function StudentProfilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [student, setStudent] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState<string | null>(null);
  const [togglingActive, setTogglingActive] = useState(false);
  const pdf = usePDF(`student-${params.id}`);

  const handleToggleActive = async () => {
    if (!student) return;
    setTogglingActive(true);
    try {
      const res = await fetch(`/api/students/${student.id}`, {
        method: "PUT",
        body: (() => {
          const fd = new FormData();
          fd.set("active", String(!student.active));
          return fd;
        })(),
      });
      if (!res.ok) throw new Error("Failed to toggle status");
      setStudent(prev => prev ? { ...prev, active: !prev.active } : prev);
      toast.success(`Student ${student.active ? "deactivated" : "activated"} successfully`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to toggle status");
    } finally {
      setTogglingActive(false);
    }
  };

  const handleResetPassword = async () => {
    if (!student) return;
    setResettingPassword(true);
    try {
      const res = await fetch(`/api/students/${student.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to reset password");
      }

      const data = await res.json();
      setResetPassword(data.defaultPassword);
      toast.success(`Password reset successfully for ${student.user.name}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset password");
      setResetPasswordDialogOpen(false);
    } finally {
      setResettingPassword(false);
    }
  };

  useEffect(() => {
    if (!params?.id) return;

    const fetchStudent = async () => {
      try {
        const res = await fetch(`/api/students/${params.id}`);
        if (!res.ok) throw new Error("Failed to fetch student");
        const data = await res.json();

        // Normalize dates to strings for rendering
        const normalized: StudentData = {
          ...data,
          dob: data.dob ? new Date(data.dob).toISOString() : null,
          admissionDate: new Date(data.admissionDate).toISOString(),
        };

        setStudent(normalized);
      } catch (err) {
        console.error(err);
        router.push("/admin/students"); // redirect if not found
      } finally {
        setLoading(false);
      }
    };

    fetchStudent();
  }, [params?.id, router]);

  if (loading) return <div><LoadingSkeleton type="table"/></div>;
  if (!student) return <div>Student not found.</div>;

  const totalFeesPaid = student.fees.reduce(
    (sum, f) => sum + Number(f.amountPaid),
    0
  );

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <Card className="flex flex-col sm:flex-row items-center sm:items-start gap-6 p-6 relative">
        <Avatar className="w-36 h-36">
          <AvatarImage
            src={student.profileImg || "/default-avatar.png"}
            alt={student.user.name}
          />
          <AvatarFallback>{student.user.name[0]}</AvatarFallback>
        </Avatar>

        <div className="text-center sm:text-left flex-1 space-y-2">
          <h1 className="text-3xl font-bold text-gray-800">
            {student.user.name}
          </h1>
          <p className="text-gray-600">{student.user.email}</p>
          <p className="text-gray-500 text-sm">
            Admission No:{" "}
            <span className="font-medium">{student.admissionNo}</span> | Roll
            No: <span className="font-medium">{student.rollNumber}</span>
          </p>
          <p className="text-gray-500 text-sm">
            Class:{" "}
            <span className="font-medium">{student.class?.name || "N/A"}</span>{" "}
            | Gender:{" "}
            <span className="font-medium">{student.gender || "N/A"}</span>
          </p>
        </div>

        <div className="absolute top-4 right-4 flex gap-2">
          <PDFDownloadButton onClick={pdf.generatePDF} loading={pdf.loading} label="PDF" variant="outline" />
          <Button
            variant={student.active ? "destructive" : "default"}
            onClick={handleToggleActive}
            disabled={togglingActive}
          >
            {togglingActive ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> :
              student.active ? <ToggleRight className="h-4 w-4 mr-2" /> : <ToggleLeft className="h-4 w-4 mr-2" />
            }
            {student.active ? "Deactivate" : "Activate"}
          </Button>
          <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <KeyRound className="h-4 w-4 mr-2" />
                Reset Password
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reset Password</DialogTitle>
                <DialogDescription>
                  Are you sure you want to reset the password for {student.user.name}?
                  {resetPassword && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md">
                      <p className="text-sm font-semibold text-green-800 mb-1">
                        New Password:
                      </p>
                      <p className="text-lg font-mono text-green-900 bg-white p-2 rounded border">
                        {resetPassword}
                      </p>
                      <p className="text-xs text-green-700 mt-2">
                        Please share this password with the student securely.
                      </p>
                    </div>
                  )}
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                {resetPassword ? (
                  <Button
                    onClick={() => {
                      setResetPasswordDialogOpen(false);
                      setResetPassword(null);
                    }}
                  >
                    Close
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setResetPasswordDialogOpen(false);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleResetPassword}
                      disabled={resettingPassword}
                    >
                      {resettingPassword ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Resetting...
                        </>
                      ) : (
                        "Reset Password"
                      )}
                    </Button>
                  </>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Link href={`/admin/marksheet/${student.id}`}>
            <Button variant="outline">Download Marksheet</Button>
          </Link>
          <Link href={`/admin/students/${student.id}/edit`}>
            <Button variant="outline">Edit</Button>
          </Link>
           <div>
            <DeleteStudent studentId={student.id} />
           </div>
         
        </div>
      </Card>

      {/* Tabs */}
        <Tabs defaultValue="personal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal">Personal</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="transport">Transport</TabsTrigger>
          <TabsTrigger value="fees">Fees</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
        </TabsList>

        {/* Personal Details */}
        <TabsContent value="personal">
          <Card>
            <CardHeader>
              <CardTitle>Personal Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-600">
              <p>
                <strong>DOB:</strong>{" "}
                {student.dob ? new Date(student.dob).toDateString() : "N/A"}
              </p>
              <p>
                <strong>Address:</strong> {student.address || "N/A"}
              </p>
              <p>
                <strong>Active:</strong>{" "}
                {student.active ? (
                  <Badge variant="outline">Yes</Badge>
                ) : (
                  <Badge variant="destructive">No</Badge>
                )}
              </p>
              <p>
                <strong>Aadhar No:</strong> {student.user.adharNo || "N/A"}
              </p>
              <p>
                <strong>Contact No:</strong> {student.contactNo || "N/A"}
              </p>
              <p>
                <strong>Pan No:</strong> {student.panNo || "N/A"}
              </p>
              <p>
                <strong>APAAR ID:</strong> {student.apaarId || "N/A"}
              </p>
              <p>
                <strong>Father Aadhar:</strong> {student.fatherAadhar || "N/A"}
              </p>
              <p>
                <strong>Mother Aadhar:</strong> {student.motherAadhar || "N/A"}
              </p>
              <p>
                <strong>Fathers Name:</strong> {student.fatherName || "N/A"}
              </p>
              <p>
                <strong>Mothers Name:</strong> {student.motherName || "N/A"}
              </p>
              <p>
                <strong>Occupation:</strong> {student.occupation || "N/A"}
              </p>
              <p>
                <strong>Religion:</strong> {student.religion || "N/A"}
              </p>
              <p>
                <strong>Caste:</strong> {student.caste || "N/A"}
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Academic Details */}
        <TabsContent value="academic">
          <Card>
            <CardHeader>
              <CardTitle>Academic Info</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-600">
              <p>
                <strong>Class:</strong> {student.class?.name || "N/A"}
              </p>
              <p>
                <strong>Admission Date:</strong>{" "}
                {new Date(student.admissionDate).toDateString()}
              </p>
              <p>
                <strong>UDISE No:</strong> {student.udiseCode || "N/A"}
              </p>
              <p>
                <strong>Admission No:</strong> {student.admissionNo}
              </p>
              <p>
                <strong>Total Fees Paid:</strong> ₹{totalFeesPaid.toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </TabsContent>
        {/* Transport */}
        <TabsContent value="transport">
          <Card>
            <CardHeader>
              <CardTitle>Transport Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Uses Transport:</span>
                {student.usesTransport ? (
                  <Badge className="bg-green-100 text-green-700">Yes</Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-500">No</Badge>
                )}
              </div>

              {student.transport && student.transport.length > 0 && student.transport[0].isActive && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-600">
                  <p><strong>Route:</strong> {student.transport[0].routeName || "N/A"}</p>
                  <p><strong>Stop:</strong> {student.transport[0].stopName || "N/A"}</p>
                  <p><strong>Bus Number:</strong> {student.transport[0].busNumber || "N/A"}</p>
                  <p><strong>Transport Fee:</strong> {student.transport[0].feeAmount ? `₹${Number(student.transport[0].feeAmount).toLocaleString()}` : "N/A"}</p>
                  <p><strong>Driver Name:</strong> {student.transport[0].driverName || "N/A"}</p>
                  <p><strong>Driver Phone:</strong> {student.transport[0].driverPhone || "N/A"}</p>
                </div>
              )}

              {(!student.transport || student.transport.length === 0 || !student.transport[0].isActive) && student.usesTransport && (
                <p className="text-sm text-yellow-600">Student is marked as using transport but no transport assignment details found.</p>
              )}

              <div className="pt-4">
                <a
                  href="/admin/transport"
                  className="text-sm text-blue-600 hover:underline font-medium"
                >
                  Manage Transport Assignments →
                </a>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Fees */}
        <TabsContent value="fees">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Fee History by Academic Year</CardTitle>
                <Link
                  href={`/admin/fees/slip/${student.id}`}
                  className="inline-flex items-center px-3 py-1.5 rounded-md bg-black text-white text-xs font-semibold hover:bg-gray-800 transition"
                >
                  <Receipt className="h-3.5 w-3.5 mr-1.5" />
                  Download Fee Statement
                </Link>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {student.fees.length === 0 ? (
                <p className="text-gray-500">No fee records found.</p>
              ) : (
                <FeeHistoryBySession fees={student.fees} usesTransport={student.usesTransport} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Results Information</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {student.results.length === 0 ? (
                <p className="text-gray-500">No results available.</p>
              ) : (
                <div className="grid gap-4">
                  {student.results.map((result) => (
                    <Card
                      key={result.id}
                      className="border border-gray-200 p-4"
                    >
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium text-gray-700">
                          {result.exam?.name || "General Exam"} -{" "}
                          {result.subject?.name || "Subject"}
                        </span>
                        {result.grade && (
                          <Badge variant="outline">{result.grade}</Badge>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-gray-600 text-sm">
                        <p>
                          <strong>Marks Obtained:</strong> {result.marks}/
                          {result.maxMarks}
                        </p>
                        <p>
                          <strong>Remarks:</strong> {result.remarks || "N/A"}
                        </p>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="documents">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Documents</CardTitle>
                <label className="cursor-pointer inline-flex items-center px-3 py-1.5 rounded-md bg-black text-white text-xs font-semibold hover:bg-gray-800 transition">
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  Upload Document
                  <input
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file || !student) return;
                      const type = prompt("Document type (e.g. Aadhaar, Marksheet, TC):");
                      const title = prompt("Document title:");
                      if (!type || !title) { toast.error("Type and title required"); return; }
                      const fd = new FormData();
                      fd.set("file", file);
                      fd.set("type", type);
                      fd.set("title", title);
                      try {
                        const res = await fetch(`/api/students/${student.id}/documents`, { method: "POST", body: fd });
                        if (!res.ok) throw new Error("Upload failed");
                        toast.success("Document uploaded");
                        setStudent(prev => prev ? { ...prev } : prev);
                        const docsRes = await fetch(`/api/students/${student.id}/documents`);
                        const docsJson = await docsRes.json();
                        setStudent(prev => prev ? { ...prev, documents: docsJson.data } : prev);
                      } catch { toast.error("Upload failed"); }
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
            </CardHeader>
            <CardContent>
              <DocumentsViewer studentId={student.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendance">
          <Card>
            <CardHeader>
              <CardTitle>Attendance</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {student.attendance.length === 0 ? (
                <p className="text-gray-500">
                  No attendance records available.
                </p>
              ) : (
                <div className="grid gap-2">
                  {student.attendance.map((record) => (
                    <Card
                      key={record.id}
                      className="border border-gray-200 p-4 flex justify-between items-center"
                    >
                      <p className="text-gray-700 font-medium">
                        {new Date(record.date).toDateString()}
                      </p>
                      <Badge
                        variant={
                          record.status === "PRESENT"
                            ? "default"
                            : record.status === "ABSENT"
                            ? "destructive"
                            : record.status === "LEAVE"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {record.status}
                      </Badge>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6">
        <Link
          href="/admin/students"
          className="text-blue-600 hover:underline font-medium"
        >
          ← Back to Students
        </Link>
      </div>
    </div>
  );
}

// ---------- Fee History by Session Component ----------

interface FeeForSession {
  id: string;
  amountPaid: number;
  remainAmount: string | number;
  status: "PAID" | "PENDING" | "PARTIAL";
  paymentDate?: string | null;
  feeStructure?: {
    name: string;
    total: string;
    transportFee: string | null;
    monthlyFee: string | null;
    totalMonths: number;
    class: {
      id: string;
      name: string;
      academicSession: {
        id: string;
        name: string;
        isActive: boolean;
      } | null;
    };
  } | null;
}

function FeeHistoryBySession({
  fees,
  usesTransport,
}: {
  fees: FeeForSession[];
  usesTransport: boolean;
}) {
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());

  // Group fees by academic session
  const sessionMap = new Map<string, {
    sessionId: string;
    sessionName: string;
    isActive: boolean;
    classes: Array<{
      classId: string;
      className: string;
      structures: Array<{
        structureId: string;
        name: string;
        total: number;
        paidAmount: number;
        remainingAmount: number;
        status: string;
        paymentDate: string | null;
      }>;
    }>;
  }>();

  for (const fee of fees) {
    const fs = fee.feeStructure;
    if (!fs?.class?.academicSession) continue;

    const session = fs.class.academicSession;
    const key = session.id;

    if (!sessionMap.has(key)) {
      sessionMap.set(key, {
        sessionId: session.id,
        sessionName: session.name,
        isActive: session.isActive,
        classes: [],
      });
    }

    let classEntry = sessionMap.get(key)!.classes.find(
      (c) => c.classId === fs.class.id
    );
    if (!classEntry) {
      classEntry = {
        classId: fs.class.id,
        className: fs.class.name,
        structures: [],
      };
      sessionMap.get(key)!.classes.push(classEntry);
    }

    const totalAmount = Number(fs.total);
    let adjustedTotal = totalAmount;
    if (fs.transportFee && !usesTransport) {
      adjustedTotal -= Number(fs.transportFee);
    }
    const paidAmount = Number(fee.amountPaid);
    const remainingAmount = Math.max(adjustedTotal - paidAmount, 0);

    classEntry.structures.push({
      structureId: fee.id,
      name: fs.name || "Fee Structure",
      total: adjustedTotal,
      paidAmount,
      remainingAmount,
      status: fee.status,
      paymentDate: fee.paymentDate ?? null,
    });
  }

  const sessions = Array.from(sessionMap.values()).sort((a, b) => {
    if (a.isActive) return -1;
    if (b.isActive) return 1;
    return a.sessionName.localeCompare(b.sessionName);
  });

  const toggleSession = (id: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100"><CheckCircle2 className="h-3 w-3 mr-1" />Paid</Badge>;
      case "PARTIAL":
        return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100"><Clock className="h-3 w-3 mr-1" />Partial</Badge>;
      case "PENDING":
        return <Badge className="bg-red-100 text-red-700 hover:bg-red-100"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-3">
      {sessions.length === 0 ? (
        <p className="text-gray-500">No fee records found.</p>
      ) : (
        sessions.map((session) => {
          const sessionTotal = session.classes.reduce(
            (sum, c) => sum + c.structures.reduce((s, fs) => s + fs.total, 0),
            0
          );
          const sessionPaid = session.classes.reduce(
            (sum, c) => sum + c.structures.reduce((s, fs) => s + fs.paidAmount, 0),
            0
          );
          const sessionRemaining = session.classes.reduce(
            (sum, c) => sum + c.structures.reduce((s, fs) => s + fs.remainingAmount, 0),
            0
          );
          const isExpanded = expandedSessions.has(session.sessionId);

          return (
            <div key={session.sessionId} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => toggleSession(session.sessionId)}
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-900 text-sm">{session.sessionName}</span>
                      {session.isActive && (
                        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 text-xs">Current</Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{session.classes.map((c) => c.className).join(", ")}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <div className="text-right">
                    <p className="text-gray-500">Total</p>
                    <p className="font-semibold">₹{sessionTotal.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">Paid</p>
                    <p className="font-semibold text-green-600">₹{sessionPaid.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-gray-500">Remaining</p>
                    <p className={`font-semibold ${sessionRemaining > 0 ? "text-red-600" : "text-green-600"}`}>
                      ₹{sessionRemaining.toLocaleString()}
                    </p>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t bg-gray-50 p-3 space-y-2">
                  {session.classes.map((cls) => (
                    <div key={cls.classId}>
                      <h4 className="text-xs font-semibold text-gray-700 mb-1.5">{cls.className}</h4>
                      <div className="space-y-1.5">
                        {cls.structures.map((structure) => {
                          const progressPct = structure.total > 0
                            ? Math.round((structure.paidAmount / structure.total) * 100)
                            : 0;

                          return (
                            <div key={structure.structureId} className="bg-white p-2.5 rounded border flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900 text-sm truncate">{structure.name}</p>
                                  <span className="text-xs text-gray-400 shrink-0">{statusBadge(structure.status)}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                  <span>Fee: <strong>₹{structure.total.toLocaleString()}</strong></span>
                                  <span>Paid: <strong className="text-green-600">₹{structure.paidAmount.toLocaleString()}</strong></span>
                                  <span>Remaining: <strong className={structure.remainingAmount > 0 ? "text-red-600" : "text-green-600"}>₹{structure.remainingAmount.toLocaleString()}</strong></span>
                                  {structure.paymentDate && (
                                    <span>Date: {new Date(structure.paymentDate).toLocaleDateString()}</span>
                                  )}
                                </div>
                                {structure.remainingAmount > 0 && (
                                  <div className="mt-1.5 w-full bg-gray-200 rounded-full h-1.5 max-w-[200px]">
                                    <div className="bg-green-600 h-1.5 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
