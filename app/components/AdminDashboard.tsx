"use client";

import type { StudentRow as Student } from "@/lib/types";
import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import {
  Users,
  UserCheck,
  Layers,
  IndianRupee,
  UserPlus,
  Download,
  TrendingUp,
  TrendingDown,
  School,
  BookOpen,
} from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

import AttendanceTrendCharts from "./charts/attendanceTrendCharts";
import { CurrentMonthFeeStatusChart } from "./charts/DashboardFeeCharts";
import ClassWiseCharts from "./charts/classWiseCharts";

export interface AdminDashboardProps {
  stats: {
    totalStudents: number;
    totalStaff: number;
    totalClasses: number;
    totalSubjects: number;
    attendanceToday: number;
    prevStudents: number;
    prevStaff: number;
    prevAttendance: number;
    prevRevenue: number;
  };
  monthlyRevenue: { amount: number };
  recentStudents: Student[];
  attendanceTrend: { date: string; percentage: number }[];
  feeStatus: {
    paid: number;
    pending: number;
    overdue: number;
    collectionRate: number;
    totalExpected: number;
  };
  classWiseStudents: { name: string; studentCount: number }[];
}

const PERIODS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "This Month", value: "month" },
] as const;

export function AdminDashboard({
  stats,
  monthlyRevenue,
  recentStudents,
  attendanceTrend,
  feeStatus,
  classWiseStudents,
}: AdminDashboardProps) {
  const [period, setPeriod] = useState<number | "month">(7);
  const dashboardRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!dashboardRef.current) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(dashboardRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();

      if (pdfHeight > pageHeight) {
        let heightLeft = pdfHeight;
        let position = 0;
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
        while (heightLeft > 0) {
          position -= pageHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
          heightLeft -= pageHeight;
        }
      } else {
        pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      }
      pdf.save("dashboard-report.pdf");
    } catch (err) {
      console.error("PDF export failed", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-6 p-6" ref={dashboardRef}>
      {/* =======================
         Filter + Export Bar
      ======================= */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-600">Period:</span>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden">
            {PERIODS.map((p) => (
              <button
                key={String(p.value)}
                onClick={() => setPeriod(p.value)}
                className={`px-4 py-1.5 text-sm font-medium transition ${
                  period === p.value
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleExportPDF}
          disabled={exporting}
          className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          {exporting ? "Exporting..." : "Export PDF"}
        </button>
      </div>

      {/* =======================
         Top Stats with Trends
      ======================= */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={Users}
          gradient="from-blue-500 to-cyan-500"
          trend={stats.totalStudents - stats.prevStudents}
        />
        <StatCard
          title="Total Staff"
          value={stats.totalStaff}
          icon={UserCheck}
          gradient="from-emerald-500 to-green-500"
          trend={stats.totalStaff - stats.prevStaff}
        />
        <StatCard
          title="Attendance Today"
          value={`${stats.attendanceToday}%`}
          icon={Layers}
          gradient="from-violet-500 to-purple-500"
          trend={stats.attendanceToday - stats.prevAttendance}
        />
        <StatCard
          title="Monthly Revenue"
          value={`₹${(monthlyRevenue.amount / 1000).toFixed(1)}K`}
          icon={IndianRupee}
          gradient="from-rose-500 to-red-500"
          trend={monthlyRevenue.amount - stats.prevRevenue}
          isCurrency
        />
      </div>

      {/* =======================
         Secondary Stats Row
      ======================= */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <SimpleStatCard
          title="Total Classes"
          value={stats.totalClasses}
          icon={School}
          color="text-blue-600"
          bgColor="bg-blue-100"
        />
        <SimpleStatCard
          title="Total Subjects"
          value={stats.totalSubjects}
          icon={BookOpen}
          color="text-emerald-600"
          bgColor="bg-emerald-100"
        />
        <SimpleStatCard
          title="Fee Collection"
          value={`${feeStatus.collectionRate}%`}
          icon={IndianRupee}
          color="text-amber-600"
          bgColor="bg-amber-100"
        />
        <SimpleStatCard
          title="Recent Students"
          value={recentStudents.length}
          icon={UserPlus}
          color="text-violet-600"
          bgColor="bg-violet-100"
        />
      </div>

      {/* =======================
         Charts Section
      ======================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-4 shadow-lg">
          <CardHeader>
            <CardTitle>Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceTrendCharts data={attendanceTrend} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 shadow-lg">
          <CardHeader>
            <CardTitle>Fee Status</CardTitle>
          </CardHeader>
          <CardContent>
            <CurrentMonthFeeStatusChart {...feeStatus} />
          </CardContent>
        </Card>
      </div>

      {/* =======================
         Distribution + Recent
      ======================= */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>Class-wise Student Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ClassWiseCharts data={classWiseStudents} />
          </CardContent>
        </Card>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Recently Added
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentStudents.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No students added recently.
              </p>
            ) : (
              <ul className="space-y-3">
                {recentStudents.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border bg-muted/50 px-3 py-2"
                  >
                    <div>
                      <p className="font-medium">{s.admissionNo}</p>
                      <p className="text-xs text-muted-foreground">
                        Roll: {s.rollNumber}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  gradient,
  trend,
  isCurrency,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  gradient: string;
  trend: number;
  isCurrency?: boolean;
}) {
  const isUp = trend >= 0;
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300 }}
    >
      <Card className="relative overflow-hidden shadow-lg">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-10`}
        />
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-6 w-6 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold tracking-tight">{value}</p>
          <div className={`mt-1 flex items-center gap-1 text-xs font-medium ${isUp ? "text-green-600" : "text-red-600"}`}>
            {isUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            <span>{isUp ? "+" : ""}{isCurrency ? `₹${Math.abs(trend).toLocaleString()}` : trend}</span>
            <span className="text-gray-400 ml-1">vs prev period</span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SimpleStatCard({
  title,
  value,
  icon: Icon,
  color,
  bgColor,
}: {
  title: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`rounded-lg ${bgColor} p-2.5`}>
          <Icon className={`h-5 w-5 ${color}`} />
        </div>
        <div>
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
