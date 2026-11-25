"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { format } from "date-fns";
import {
  Users, Wallet, CalendarCheck, ClipboardList, BarChart3,
  Download, Printer, FileSpreadsheet, TrendingUp, RefreshCw,
  Search
} from "lucide-react";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";

function n(v: unknown): number {
  if (v == null) return 0;
  if (typeof v === "string") { const num = Number(v); return Number.isFinite(num) ? num : 0; }
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  return 0;
}

function fmt(d: unknown): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : (d instanceof Date ? d : new Date(String(d)));
  return Number.isNaN(date.getTime()) ? "—" : format(date, "dd/MM/yyyy");
}

function fmtCurrency(v: number): string {
  return "₹" + v.toLocaleString("en-IN");
}

const TABS = [
  { value: "students", label: "Student Reports", icon: Users },
  { value: "fees", label: "Fee Reports", icon: Wallet },
  { value: "attendance", label: "Attendance Reports", icon: CalendarCheck },
  { value: "exams", label: "Exam Reports", icon: ClipboardList },
  { value: "finance", label: "Finance Reports", icon: TrendingUp },
] as const;

// ============ HELPERS ============

function downloadCSV(rows: Record<string, unknown>[], filename: string) {
  if (rows.length === 0) {
    toast.error("No data to export");
    return;
  }
  const headers = Object.keys(rows[0]);
  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      headers.map((h) => {
        const val = row[h];
        const str = val == null ? "" : String(val);
        return str.includes(",") || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
      }).join(",")
    ),
  ].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV downloaded");
}

async function downloadPDF(ref: HTMLDivElement | null, filename: string) {
  if (!ref) {
    toast.error("Report content not found");
    return;
  }
  try {
    const canvas = await html2canvas(ref, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
    toast.success("PDF downloaded");
  } catch {
    toast.error("Failed to generate PDF");
  }
}

function printReport(ref: HTMLDivElement | null) {
  if (!ref) {
    toast.error("Report content not found");
    return;
  }
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    toast.error("Please allow popups for printing");
    return;
  }
  printWindow.document.write(`
    <html><head><title>Report</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 20px; }
      table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
      th { background: #f5f5f5; font-weight: 600; }
      h2 { margin-bottom: 4px; }
      .text-right { text-align: right; }
    </style></head><body>
  `);
  printWindow.document.write(ref.innerHTML);
  printWindow.document.write("</body></html>");
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}

// ============ REPORT ACTIONS ============

function ReportActions({ reportRef, filename, onCsv, csvReady }: {
  reportRef: React.RefObject<HTMLDivElement | null>;
  filename: string;
  onCsv?: () => void;
  csvReady?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => printReport(reportRef.current)}>
        <Printer className="h-4 w-4 mr-1" /> Print
      </Button>
      <Button variant="outline" size="sm" onClick={() => downloadPDF(reportRef.current, filename)}>
        <Download className="h-4 w-4 mr-1" /> PDF
      </Button>
      <Button variant="outline" size="sm" onClick={onCsv} disabled={!csvReady}>
        <FileSpreadsheet className="h-4 w-4 mr-1" /> CSV
      </Button>
    </div>
  );
}

// ============ FILTER BAR ============

function FilterBar({ children, onGenerate, loading }: {
  children: React.ReactNode;
  onGenerate: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 mb-4 p-4 border rounded-lg bg-gray-50">
      {children}
      <Button onClick={onGenerate} disabled={loading}>
        {loading ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <Search className="h-4 w-4 mr-1" />}
        {loading ? "Generating..." : "Generate"}
      </Button>
    </div>
  );
}

// ============ REPORT CARD GRID ============

type ReportAction = {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
};

function ReportCardGrid({ items, onSelect }: { items: ReportAction[]; onSelect: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <motion.div
          key={item.id}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => onSelect(item.id)}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                {item.icon}
                <CardTitle className="text-base">{item.label}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>{item.description}</CardDescription>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}

// ============ REPORT TABLE WRAPPER ============

function ReportTable({ columns, data }: {
  columns: { key: string; label: string; render?: (val: unknown, row: Record<string, unknown>) => React.ReactNode }[];
  data: Record<string, unknown>[];
}) {
  if (data.length === 0) {
    return <p className="text-center text-gray-500 py-8">No data available</p>;
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((col) => (
              <TableHead key={col.key}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, i) => (
            <TableRow key={i}>
              {columns.map((col) => (
                <TableCell key={col.key}>
                  {col.render ? col.render(row[col.key], row) : String(row[col.key] ?? "—")}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

// ============================================================
// TAB: STUDENT REPORTS
// ============================================================

const studentReportItems: ReportAction[] = [
  { id: "all", label: "All Students", icon: <Users className="h-5 w-5 text-blue-600" />, description: "View all active students with details" },
  { id: "class-wise", label: "Class-wise", icon: <Users className="h-5 w-5 text-green-600" />, description: "Students grouped by class" },
  { id: "gender-wise", label: "Gender-wise", icon: <Users className="h-5 w-5 text-purple-600" />, description: "Student count by gender" },
  { id: "new-admissions", label: "New Admissions", icon: <Users className="h-5 w-5 text-orange-600" />, description: "Students admitted in a date range" },
  { id: "birthdays", label: "Student Birthdays", icon: <Users className="h-5 w-5 text-pink-600" />, description: "Students with birthdays in a month" },
];

function StudentReportContent() {
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [classId, setClassId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [month, setMonth] = useState("");
  const [data, setData] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/classes").then((r) => r.json()).then((res) => {
      const list = res.data ?? res;
      setClasses(Array.isArray(list) ? list.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })) : []);
    }).catch(() => {});
  }, []);

  const generate = useCallback(async () => {
    if (!activeReport) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: activeReport });
      if (classId) params.set("classId", classId);
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      if (month) params.set("month", month);
      const res = await fetch(`/api/reports/students?${params}`);
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const json = await res.json();
      setData(Array.isArray(json) ? json : json.counts ? json : []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to fetch");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [activeReport, classId, fromDate, toDate, month]);

  useEffect(() => { if (activeReport) generate(); }, [activeReport, generate]);

  const getCsvData = useCallback(() => {
    if (!data) return;
    if (activeReport === "gender-wise") {
      const d = data as unknown as { labels: string[]; counts: number[] };
      downloadCSV(d.labels.map((l, i) => ({ Gender: l, Count: d.counts[i] })), "gender-wise-report");
      return;
    }
    if (activeReport === "class-wise") {
      const flat: Record<string, unknown>[] = [];
      for (const group of data as unknown as { className: string; students: Record<string, unknown>[] }[]) {
        for (const s of group.students) {
          flat.push({ className: group.className, ...s });
        }
      }
      downloadCSV(flat, "class-wise-report");
      return;
    }
    downloadCSV(data, "students-report");
  }, [data, activeReport]);

  const getFilename = () => `student-${activeReport}-report`;

  const renderTable = () => {
    if (!data) return null;
    if (activeReport === "gender-wise") {
      const d = data as unknown as { labels: string[]; counts: number[] };
      return (
        <ReportTable
          columns={[
            { key: "Gender", label: "Gender" },
            { key: "Count", label: "Count" },
          ]}
          data={d.labels.map((l, i) => ({ Gender: l, Count: d.counts[i] }))}
        />
      );
    }
    if (activeReport === "class-wise") {
      const groups = data as unknown as { className: string; count: number; students: Record<string, unknown>[] }[];
      return (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.className}>
              <h4 className="font-semibold text-sm mb-2">{g.className} ({g.count} students)</h4>
              <ReportTable
                columns={[
                  { key: "admissionNo", label: "Adm No" },
                  { key: "rollNumber", label: "Roll No" },
                  { key: "name", label: "Name" },
                  { key: "gender", label: "Gender" },
                ]}
                data={g.students}
              />
            </div>
          ))}
        </div>
      );
    }
    if (activeReport === "birthdays") {
      return (
        <ReportTable
          columns={[
            { key: "admissionNo", label: "Adm No" },
            { key: "rollNumber", label: "Roll No" },
            { key: "name", label: "Name" },
            { key: "className", label: "Class" },
            { key: "dob", label: "DOB", render: (v) => fmt(v as string) },
          ]}
          data={data}
        />
      );
    }
    return (
      <ReportTable
        columns={[
          { key: "admissionNo", label: "Adm No" },
          { key: "rollNumber", label: "Roll No" },
          { key: "name", label: "Name" },
          { key: "className", label: "Class" },
          { key: "gender", label: "Gender" },
          { key: "fatherName", label: "Father" },
          { key: "admissionDate", label: "Admission Date", render: (v) => fmt(v as string) },
        ]}
        data={data}
      />
    );
  };

  return (
    <div>
      <ReportCardGrid items={studentReportItems} onSelect={setActiveReport} />
      {activeReport && (
        <div className="mt-6 border rounded-lg p-4 bg-white">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold capitalize">{activeReport.replace("-", " ")} Report</h3>
          </div>
          <FilterBar onGenerate={generate} loading={loading}>
            {activeReport === "class-wise" && (
              <div>
                <label className="block text-xs mb-1">Class</label>
                <Select value={classId} onValueChange={setClassId}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="All Classes" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {activeReport === "new-admissions" && (
              <>
                <div>
                  <label className="block text-xs mb-1">From Date</label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
                </div>
                <div>
                  <label className="block text-xs mb-1">To Date</label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
                </div>
              </>
            )}
            {activeReport === "birthdays" && (
              <div>
                <label className="block text-xs mb-1">Month</label>
                <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
              </div>
            )}
          </FilterBar>
          {data && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{data.length} records</span>
              <ReportActions reportRef={reportRef} filename={getFilename()} onCsv={getCsvData} csvReady={data.length > 0} />
            </div>
          )}
          <div ref={reportRef}>{renderTable()}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TAB: FEE REPORTS
// ============================================================

const feeReportItems: ReportAction[] = [
  { id: "daily", label: "Daily Collection", icon: <Wallet className="h-5 w-5 text-green-600" />, description: "Fee collection grouped by day" },
  { id: "monthly", label: "Monthly Collection", icon: <Wallet className="h-5 w-5 text-blue-600" />, description: "Fee collection grouped by month" },
  { id: "pending", label: "Pending Fee", icon: <Wallet className="h-5 w-5 text-red-600" />, description: "Students with pending fee balances" },
  { id: "defaulters", label: "Defaulter List", icon: <Wallet className="h-5 w-5 text-orange-600" />, description: "Students with overdue payments" },
  { id: "ledger", label: "Student Ledger", icon: <Wallet className="h-5 w-5 text-purple-600" />, description: "Individual student fee history" },
];

function FeeReportContent() {
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [classId, setClassId] = useState("");
  const [data, setData] = useState<Record<string, unknown>[] | null>(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [studentSearch, setStudentSearch] = useState("");

  useEffect(() => {
    fetch("/api/classes").then((r) => r.json()).then((res) => {
      const list = res.data ?? res;
      setClasses(Array.isArray(list) ? list.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })) : []);
    }).catch(() => {});
  }, []);

  const generate = useCallback(async () => {
    if (!activeReport) return;
    setLoading(true);
    try {
      if (activeReport === "daily" || activeReport === "monthly") {
        const params = new URLSearchParams({
          groupBy: activeReport,
        });
        if (fromDate) params.set("fromDate", fromDate);
        if (toDate) params.set("toDate", toDate);
        if (classId && classId !== "all") params.set("classId", classId);
        const res = await fetch(`/api/reports/fees?${params}`);
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
        const json = await res.json();
        setData(Array.isArray(json) ? json : []);
      } else if (activeReport === "pending" || activeReport === "defaulters") {
        // Balances come from the fee service, which already accounts for
        // transport, concessions and late fines per student.
        const params = new URLSearchParams();
        if (classId && classId !== "all") params.set("classId", classId);
        if (activeReport === "defaulters") params.set("overdue", "true");
        const res = await fetch(`/api/fees/dues?${params}`);
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Failed");
        const json = (await res.json()) as {
          items: Array<{ name: string; admissionNo: string; className: string; payable: number; paid: number; remaining: number; overdue: number }>;
        };
        setData(
          json.items.map((r) => ({
            name: r.name,
            admissionNo: r.admissionNo,
            className: r.className || "—",
            totalDue: r.payable,
            totalPaid: r.paid,
            balance: r.remaining,
            overdue: r.overdue,
          }))
        );
      } else if (activeReport === "ledger") {
        const params = new URLSearchParams({ pageSize: "100" });
        if (studentSearch) params.set("q", studentSearch);
        if (classId && classId !== "all") params.set("classId", classId);
        if (fromDate) params.set("from", fromDate);
        if (toDate) params.set("to", toDate);
        const res = await fetch(`/api/fees/payments?${params}`);
        if (!res.ok) throw new Error("Failed");
        const json = (await res.json()) as {
          items: Array<{
            id: string; receiptNo: string; amount: number; paymentMode: string; paymentDate: string;
            student: { name: string; admissionNo: string }; className: string; structureName: string;
          }>;
        };
        setData(
          json.items.map((p) => ({
            id: p.id,
            receiptNo: p.receiptNo,
            studentName: p.student.name,
            admissionNo: p.student.admissionNo || "—",
            className: p.className || "—",
            feeName: p.structureName,
            amountPaid: p.amount,
            status: p.paymentMode,
            paymentDate: p.paymentDate,
          }))
        );
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to fetch");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [activeReport, fromDate, toDate, classId, studentSearch]);

  useEffect(() => { if (activeReport) generate(); }, [activeReport, generate]);

  const getCsvData = useCallback(() => {
    if (!data) return;
    downloadCSV(data, `fee-${activeReport}-report`);
  }, [data, activeReport]);

  const renderTable = () => {
    if (!data) return null;
    if (activeReport === "daily" || activeReport === "monthly") {
      return (
        <ReportTable
          columns={[
            { key: "period", label: "Period" },
            { key: "totalCollected", label: "Total Collected", render: (v) => fmtCurrency(n(v)) },
            { key: "totalDiscount", label: "Concessions", render: (v) => fmtCurrency(n(v)) },
            { key: "paymentCount", label: "Payments" },
          ]}
          data={data}
        />
      );
    }
    if (activeReport === "pending" || activeReport === "defaulters") {
      return (
        <ReportTable
          columns={[
            { key: "name", label: "Student" },
            { key: "admissionNo", label: "Adm No" },
            { key: "className", label: "Class" },
            { key: "totalDue", label: "Total Due", render: (v) => fmtCurrency(n(v)) },
            { key: "totalPaid", label: "Total Paid", render: (v) => fmtCurrency(n(v)) },
            { key: "balance", label: "Balance", render: (v) => fmtCurrency(n(v)) },
            { key: "overdue", label: "Overdue", render: (v) => fmtCurrency(n(v)) },
          ]}
          data={data}
        />
      );
    }
    return (
      <ReportTable
        columns={[
          { key: "receiptNo", label: "Receipt" },
          { key: "studentName", label: "Student" },
          { key: "admissionNo", label: "Adm No" },
          { key: "className", label: "Class" },
          { key: "feeName", label: "Fee" },
          { key: "amountPaid", label: "Amount", render: (v) => fmtCurrency(n(v)) },
          { key: "status", label: "Mode" },
          { key: "paymentDate", label: "Date", render: (v) => fmt(v as string) },
        ]}
        data={data}
      />
    );
  };

  return (
    <div>
      <ReportCardGrid items={feeReportItems} onSelect={setActiveReport} />
      {activeReport && (
        <div className="mt-6 border rounded-lg p-4 bg-white">
          <h3 className="text-lg font-semibold mb-4 capitalize">{activeReport.replace("-", " ")} Report</h3>
          <FilterBar onGenerate={generate} loading={loading}>
            {(activeReport === "daily" || activeReport === "monthly" || activeReport === "pending" || activeReport === "defaulters") && (
              <>
                <div>
                  <label className="block text-xs mb-1">From</label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
                </div>
                <div>
                  <label className="block text-xs mb-1">To</label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
                </div>
                <div>
                  <label className="block text-xs mb-1">Class</label>
                  <Select value={classId} onValueChange={setClassId}>
                    <SelectTrigger className="w-40"><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Classes</SelectItem>
                      {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            {activeReport === "ledger" && (
              <>
                <div>
                  <label className="block text-xs mb-1">Student ID</label>
                  <Input
                    type="text" placeholder="Search by ID"
                    value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)}
                    className="w-40"
                  />
                </div>
              </>
            )}
          </FilterBar>
          {data && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{data.length} records</span>
              <ReportActions reportRef={reportRef} filename={`fee-${activeReport}-report`} onCsv={getCsvData} csvReady={data.length > 0} />
            </div>
          )}
          <div ref={reportRef}>{renderTable()}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TAB: ATTENDANCE REPORTS
// ============================================================

const attendanceReportItems: ReportAction[] = [
  { id: "daily", label: "Daily Attendance", icon: <CalendarCheck className="h-5 w-5 text-blue-600" />, description: "Attendance for a specific day" },
  { id: "monthly", label: "Monthly Attendance", icon: <CalendarCheck className="h-5 w-5 text-green-600" />, description: "Attendance summary by month" },
  { id: "low-attendance", label: "Low Attendance", icon: <CalendarCheck className="h-5 w-5 text-red-600" />, description: "Students with below-threshold attendance" },
];

function AttendanceReportContent() {
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [classId, setClassId] = useState("");
  const [data, setData] = useState<Record<string, unknown>[] | null>(null);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/classes").then((r) => r.json()).then((res) => {
      const list = res.data ?? res;
      setClasses(Array.isArray(list) ? list.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })) : []);
    }).catch(() => {});
  }, []);

  const generate = useCallback(async () => {
    if (!activeReport) return;
    setLoading(true);
    try {
      if (activeReport === "daily") {
        const date = fromDate || new Date().toISOString().slice(0, 10);
        const params = new URLSearchParams({ classId, date });
        const res = await fetch(`/api/attendance?${params}`);
        if (!res.ok) throw new Error("Failed");
        const json = await res.json();
        const records = json.data ?? json;
        setData(Array.isArray(records) ? records.map((r: Record<string, unknown>) => ({
          studentName: r.student ? ((r.student as Record<string, unknown>).user as Record<string, unknown>).name : "—",
          rollNumber: r.student ? (r.student as Record<string, unknown>).rollNumber : "—",
          status: r.status,
        })) : []);
        setSummary(null);
      } else if (activeReport === "monthly" || activeReport === "low-attendance") {
        const params = new URLSearchParams({ classId });
        if (fromDate) params.set("fromDate", fromDate);
        if (toDate) params.set("toDate", toDate);
        const res = await fetch(`/api/reports/attendance?${params}`);
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
        const json = await res.json();

        if (activeReport === "low-attendance") {
          const details = (json.details ?? []) as Record<string, unknown>[];
          const studentStats = new Map<string, { name: string; present: number; total: number }>();
          for (const d of details) {
            const sid = d.studentId as string;
            if (!studentStats.has(sid)) {
              studentStats.set(sid, { name: d.studentName as string, present: 0, total: 0 });
            }
            const s = studentStats.get(sid)!;
            s.total++;
            if (d.status === "PRESENT" || d.status === "LATE") s.present++;
          }
          const threshold = 0.75;
          const low = Array.from(studentStats.values())
            .filter((s) => s.total > 0 && s.present / s.total < threshold)
            .map((s) => ({ name: s.name, present: s.present, total: s.total, percentage: Number(((s.present / s.total) * 100).toFixed(1)) }));
          setData(low);
          setSummary(null);
        } else {
          setSummary(json.summary as Record<string, unknown>);
          setData(null);
        }
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to fetch");
      setData(null);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [activeReport, fromDate, toDate, classId]);

  useEffect(() => { if (activeReport) generate(); }, [activeReport, generate]);

  const getCsvData = useCallback(() => {
    if (data) downloadCSV(data, `attendance-${activeReport}-report`);
    else if (summary) downloadCSV([summary], `attendance-${activeReport}-report`);
  }, [data, summary, activeReport]);

  const renderTable = () => {
    if (summary && activeReport === "monthly") {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
          {[
            { label: "Total Days", value: summary.totalDays },
            { label: "Present", value: summary.presentCount },
            { label: "Absent", value: summary.absentCount },
            { label: "Late", value: summary.lateCount },
            { label: "Leave", value: summary.leaveCount },
            { label: "Percentage", value: `${summary.percentage}%` },
          ].map((s) => (
            <Card key={s.label}>
              <CardHeader className="py-3"><CardTitle className="text-sm">{s.label}</CardTitle></CardHeader>
              <CardContent className="py-2"><p className="text-2xl font-bold">{String(s.value)}</p></CardContent>
            </Card>
          ))}
        </div>
      );
    }
    if (data) {
      return (
        <ReportTable
          columns={
            activeReport === "daily"
              ? [
                  { key: "studentName", label: "Student" },
                  { key: "rollNumber", label: "Roll No" },
                  { key: "status", label: "Status" },
                ]
              : [
                  { key: "name", label: "Student" },
                  { key: "present", label: "Present" },
                  { key: "total", label: "Total Days" },
                  { key: "percentage", label: "Percentage", render: (v) => `${String(v)}%` },
                ]
          }
          data={data}
        />
      );
    }
    return null;
  };

  return (
    <div>
      <ReportCardGrid items={attendanceReportItems} onSelect={setActiveReport} />
      {activeReport && (
        <div className="mt-6 border rounded-lg p-4 bg-white">
          <h3 className="text-lg font-semibold mb-4 capitalize">{activeReport.replace("-", " ")} Report</h3>
          <FilterBar onGenerate={generate} loading={loading}>
            <div>
              <label className="block text-xs mb-1">Class</label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Select Class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {activeReport !== "daily" && (
              <>
                <div>
                  <label className="block text-xs mb-1">From</label>
                  <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
                </div>
                <div>
                  <label className="block text-xs mb-1">To</label>
                  <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
                </div>
              </>
            )}
            {activeReport === "daily" && (
              <div>
                <label className="block text-xs mb-1">Date</label>
                <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
              </div>
            )}
          </FilterBar>
          {(data || summary) && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                {data ? `${data.length} records` : "Summary view"}
              </span>
              <ReportActions reportRef={reportRef} filename={`attendance-${activeReport}-report`} onCsv={getCsvData} csvReady={!!data || !!summary} />
            </div>
          )}
          <div ref={reportRef}>{renderTable()}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TAB: EXAM REPORTS
// ============================================================

const examReportItems: ReportAction[] = [
  { id: "class-result", label: "Class Result", icon: <ClipboardList className="h-5 w-5 text-blue-600" />, description: "Full class result with rankings" },
  { id: "subject-result", label: "Subject Result", icon: <ClipboardList className="h-5 w-5 text-green-600" />, description: "Result for a specific subject" },
  { id: "toppers", label: "Topper List", icon: <ClipboardList className="h-5 w-5 text-yellow-600" />, description: "Top ranked students" },
  { id: "failed", label: "Failed Students", icon: <ClipboardList className="h-5 w-5 text-red-600" />, description: "Students who failed in one or more subjects" },
];

function ExamReportContent() {
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [examId, setExamId] = useState("");
  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [topperLimit, setTopperLimit] = useState("10");
  const [data, setData] = useState<Record<string, unknown>[] | null>(null);
  const [metadata, setMetadata] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  const [classes, setClasses] = useState<{ id: string; name: string }[]>([]);
  const [exams, setExams] = useState<{ id: string; name: string }[]>([]);
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    fetch("/api/classes").then((r) => r.json()).then((res) => {
      const list = res.data ?? res;
      setClasses(Array.isArray(list) ? list.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })) : []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!classId) return;
    Promise.all([
      fetch(`/api/exams?classId=${classId}`).then((r) => r.json()),
      fetch(`/api/subjects?classId=${classId}`).then((r) => r.json()),
    ]).then(([examsRes, subjectsRes]) => {
      setExams(Array.isArray(examsRes) ? examsRes : examsRes.data ?? []);
      setSubjects(Array.isArray(subjectsRes) ? subjectsRes : subjectsRes.data ?? []);
    }).catch(() => {});
  }, [classId]);

  const generate = useCallback(async () => {
    if (!activeReport || !examId) {
      toast.error("Please select an exam");
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: activeReport, examId });
      if (classId) params.set("classId", classId);
      if (subjectId) params.set("subjectId", subjectId);
      if (activeReport === "toppers" && topperLimit) params.set("limit", topperLimit);
      const res = await fetch(`/api/reports/exams?${params}`);
      if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
      const json = await res.json();
      setMetadata({ examName: json.examName, className: json.className });
      setData(json.results ?? []);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to fetch");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [activeReport, examId, classId, subjectId, topperLimit]);

  const getCsvData = useCallback(() => {
    if (!data) return;
    if (activeReport === "class-result") {
      const flat = data.map((r: Record<string, unknown>) => {
        const row: Record<string, unknown> = { rollNumber: r.rollNumber, studentName: r.studentName, totalMarks: r.totalMarks, percentage: r.percentage, rank: r.rank };
        const subs = r.subjectMarks as Array<Record<string, unknown>> | undefined;
        if (subs) {
          for (const s of subs) {
            row[`${String(s.subjectName)}_Marks`] = s.marks;
            row[`${String(s.subjectName)}_Max`] = s.maxMarks;
          }
        }
        return row;
      });
      downloadCSV(flat, `exam-${activeReport}-report`);
    } else {
      downloadCSV(data, `exam-${activeReport}-report`);
    }
  }, [data, activeReport]);

  const renderTable = () => {
    if (!data) return null;
    if (activeReport === "class-result") {
      return (
        <ReportTable
          columns={[
            { key: "rank", label: "Rank" },
            { key: "rollNumber", label: "Roll No" },
            { key: "studentName", label: "Name" },
            { key: "totalMarks", label: "Total" },
            { key: "percentage", label: "Percentage", render: (v) => `${String(v)}%` },
          ]}
          data={data}
        />
      );
    }
    if (activeReport === "subject-result") {
      return (
        <ReportTable
          columns={[
            { key: "rank", label: "Rank" },
            { key: "rollNumber", label: "Roll No" },
            { key: "studentName", label: "Name" },
            { key: "marks", label: "Marks" },
            { key: "maxMarks", label: "Max Marks" },
            { key: "grade", label: "Grade" },
          ]}
          data={data}
        />
      );
    }
    if (activeReport === "toppers") {
      return (
        <ReportTable
          columns={[
            { key: "rank", label: "Rank" },
            { key: "rollNumber", label: "Roll No" },
            { key: "studentName", label: "Name" },
            { key: "totalMarks", label: "Total" },
            { key: "percentage", label: "Percentage", render: (v) => `${String(v)}%` },
          ]}
          data={data}
        />
      );
    }
    if (activeReport === "failed") {
      return (
        <ReportTable
          columns={[
            { key: "rollNumber", label: "Roll No" },
            { key: "studentName", label: "Name" },
            { key: "totalFailed", label: "Failed Subjects" },
          ]}
          data={data}
        />
      );
    }
    return null;
  };

  return (
    <div>
      <ReportCardGrid items={examReportItems} onSelect={setActiveReport} />
      {activeReport && (
        <div className="mt-6 border rounded-lg p-4 bg-white">
          <h3 className="text-lg font-semibold mb-4 capitalize">{activeReport.replace("-", " ")} Report</h3>
          <FilterBar onGenerate={generate} loading={loading}>
            <div>
              <label className="block text-xs mb-1">Class</label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Select Class" /></SelectTrigger>
                <SelectContent>
                  {classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-xs mb-1">Exam</label>
              <Select value={examId} onValueChange={setExamId}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Select Exam" /></SelectTrigger>
                <SelectContent>
                  {exams.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {activeReport === "subject-result" && (
              <div>
                <label className="block text-xs mb-1">Subject</label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger className="w-40"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {activeReport === "toppers" && (
              <div>
                <label className="block text-xs mb-1">Top N</label>
                <Input type="number" value={topperLimit} onChange={(e) => setTopperLimit(e.target.value)} className="w-20" min={1} />
              </div>
            )}
          </FilterBar>
          {metadata && (
            <div className="mb-2 text-sm text-gray-600">
              <strong>{String(metadata.examName)}</strong> — {String(metadata.className)}
            </div>
          )}
          {data && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{data.length} records</span>
              <ReportActions reportRef={reportRef} filename={`exam-${activeReport}-report`} onCsv={getCsvData} csvReady={data.length > 0} />
            </div>
          )}
          <div ref={reportRef}>{renderTable()}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// TAB: FINANCE REPORTS
// ============================================================

const financeReportItems: ReportAction[] = [
  { id: "income", label: "Income Report", icon: <TrendingUp className="h-5 w-5 text-green-600" />, description: "Fee collections breakdown" },
  { id: "expense", label: "Expense Report", icon: <TrendingUp className="h-5 w-5 text-red-600" />, description: "School expenses breakdown" },
  { id: "income-vs-expense", label: "Income vs Expense", icon: <BarChart3 className="h-5 w-5 text-blue-600" />, description: "Comparison of income and expenses" },
  { id: "monthly-summary", label: "Monthly Summary", icon: <BarChart3 className="h-5 w-5 text-purple-600" />, description: "Month-wise financial summary" },
];

function FinanceReportContent() {
  const [activeReport, setActiveReport] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [data, setData] = useState<Record<string, unknown>[] | null>(null);
  const [summary, setSummary] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const generate = useCallback(async () => {
    if (!activeReport) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);

      if (activeReport === "income") {
        params.set("groupBy", "daily");
        const res = await fetch(`/api/reports/fees?${params}`);
        if (!res.ok) throw new Error("Failed");
        const json = await res.json();
        setData(Array.isArray(json) ? json : []);
        setSummary(null);
      } else if (activeReport === "expense") {
        const res = await fetch(`/api/expenses?${params}`);
        if (!res.ok) throw new Error("Failed");
        const json = await res.json();
        setData(Array.isArray(json) ? json.map((e: Record<string, unknown>) => ({
          title: e.title,
          amount: e.amount,
          date: e.date,
          category: e.category ? (e.category as Record<string, unknown>).name : "—",
        })) : []);
        setSummary(null);
      } else {
        params.set("groupBy", activeReport === "monthly-summary" ? "monthly" : "daily");
        const res = await fetch(`/api/reports/finance?${params}`);
        if (!res.ok) throw new Error((await res.json()).error ?? "Failed");
        const json = await res.json();
        setData(json.periods ?? []);
        setSummary(json.summary ?? null);
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to fetch");
      setData(null);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  }, [activeReport, fromDate, toDate]);

  useEffect(() => { if (activeReport) generate(); }, [activeReport, generate]);

  const getCsvData = useCallback(() => {
    if (data) downloadCSV(data, `finance-${activeReport}-report`);
  }, [data, activeReport]);

  const renderTable = () => {
    if (data && activeReport === "income") {
      return (
        <ReportTable
          columns={[
            { key: "period", label: "Date" },
            { key: "totalCollected", label: "Collected", render: (v) => fmtCurrency(n(v)) },
            { key: "paymentCount", label: "Payments" },
          ]}
          data={data}
        />
      );
    }
    if (data && activeReport === "expense") {
      return (
        <ReportTable
          columns={[
            { key: "title", label: "Title" },
            { key: "category", label: "Category" },
            { key: "amount", label: "Amount", render: (v) => fmtCurrency(n(v)) },
            { key: "date", label: "Date", render: (v) => fmt(v as string) },
          ]}
          data={data}
        />
      );
    }
    if (data && (activeReport === "income-vs-expense" || activeReport === "monthly-summary")) {
      return (
        <>
          {summary && (
            <div className="grid grid-cols-3 gap-4 mb-4">
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm">Total Income</CardTitle></CardHeader>
                <CardContent className="py-2"><p className="text-xl font-bold text-green-600">{fmtCurrency(n(summary.totalIncome))}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm">Total Expense</CardTitle></CardHeader>
                <CardContent className="py-2"><p className="text-xl font-bold text-red-600">{fmtCurrency(n(summary.totalExpense))}</p></CardContent>
              </Card>
              <Card>
                <CardHeader className="py-3"><CardTitle className="text-sm">Net</CardTitle></CardHeader>
                <CardContent className="py-2">
                  <p className={`text-xl font-bold ${n(summary.net) >= 0 ? "text-green-600" : "text-red-600"}`}>
                    {fmtCurrency(n(summary.net))}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
          <ReportTable
            columns={[
              { key: "period", label: "Period" },
              { key: "income", label: "Income", render: (v) => fmtCurrency(n(v)) },
              { key: "expense", label: "Expense", render: (v) => fmtCurrency(n(v)) },
              { key: "net", label: "Net", render: (v) => (
                <span className={n(v) >= 0 ? "text-green-600" : "text-red-600"}>{fmtCurrency(n(v))}</span>
              )},
            ]}
            data={data}
          />
        </>
      );
    }
    return null;
  };

  return (
    <div>
      <ReportCardGrid items={financeReportItems} onSelect={setActiveReport} />
      {activeReport && (
        <div className="mt-6 border rounded-lg p-4 bg-white">
          <h3 className="text-lg font-semibold mb-4 capitalize">{activeReport.replace("-", " ")} Report</h3>
          <FilterBar onGenerate={generate} loading={loading}>
            <div>
              <label className="block text-xs mb-1">From</label>
              <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className="w-40" />
            </div>
            <div>
              <label className="block text-xs mb-1">To</label>
              <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className="w-40" />
            </div>
          </FilterBar>
          {(data || summary) && (
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">{data ? `${data.length} records` : ""}</span>
              <ReportActions reportRef={reportRef} filename={`finance-${activeReport}-report`} onCsv={getCsvData} csvReady={!!data} />
            </div>
          )}
          <div ref={reportRef}>{renderTable()}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================

export default function ReportsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart3 className="h-8 w-8" />
          Reports
        </h1>
        <p className="text-gray-500 mt-1">Generate and export comprehensive school reports</p>
      </div>

      <Tabs defaultValue="students" className="w-full">
        <TabsList className="mb-6 flex-wrap h-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-2">
                <Icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="students"><StudentReportContent /></TabsContent>
        <TabsContent value="fees"><FeeReportContent /></TabsContent>
        <TabsContent value="attendance"><AttendanceReportContent /></TabsContent>
        <TabsContent value="exams"><ExamReportContent /></TabsContent>
        <TabsContent value="finance"><FinanceReportContent /></TabsContent>
      </Tabs>
    </div>
  );
}
