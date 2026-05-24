"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { format } from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import {
  CalendarCheck,
  Wallet,
  BookOpen,
  Bell,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  GraduationCap,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from "recharts";
import { CurrentMonthFeeStatusChart } from "@/app/components/charts/DashboardFeeCharts";

const ATTENDANCE_COLORS = ["#4ade80", "#f87171", "#facc15", "#60a5fa"];
const RADIAN = Math.PI / 180;

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: {
  cx?: number;
  cy?: number;
  midAngle?: number;
  innerRadius?: number;
  outerRadius?: number;
  percent?: number;
}) => {
  if (cx == null || cy == null || innerRadius == null || outerRadius == null) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-(midAngle ?? 0) * RADIAN);
  const y = cy + radius * Math.sin(-(midAngle ?? 0) * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-semibold">
      {`${((percent ?? 0) * 100).toFixed(0)}%`}
    </text>
  );
};

interface DashboardData {
  student: {
    id: string;
    admissionNo: string;
    rollNumber: string;
    class: {
      id: string;
      name: string;
      grade: string;
      section: string | null;
      teacher: {
        name: string;
      } | null;
    } | null;
  };
  stats: {
    attendance: {
      total: number;
      present: number;
      absent: number;
      late: number;
      leave: number;
      percentage: number;
    };
    fees: {
      totalPaid: number;
      totalPending: number;
      pendingPayments: number;
    };
    results: {
      totalExams: number;
      resultsCount: number;
    };
    notifications: {
      unread: number;
      total: number;
    };
  };
  recent: {
    announcements: Array<{
      id: string;
      title: string;
      content: string;
      createdAt: string;
      creator: { name: string } | null;
    }>;
    upcomingExams: Array<{
      id: string;
      name: string;
      category: string;
      startDate: string;
      endDate: string;
      class: { name: string } | null;
    }>;
    recentAttendance: Array<{
      id: string;
      date: string;
      status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
    }>;
    notifications: unknown[];
  };
}

export default function StudentDashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/student/dashboard");
        if (res.ok) {
          const dashboardData = await res.json();
          setData(dashboardData);
        }
      } catch (error) {
        console.error("Error fetching dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-500">Failed to load dashboard data</p>
      </div>
    );
  }

  const { student, stats, recent } = data;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              Welcome back, {session?.user?.name}!
            </h1>
            <p className="text-blue-100">
              {student.class
                ? `${student.class.name} - Roll No: ${student.rollNumber}`
                : "Student"}
            </p>
            {student.class?.teacher && (
              <p className="text-sm text-blue-200 mt-1">
                Class Teacher: {student.class.teacher.name}
              </p>
            )}
          </div>
          <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-sm text-blue-100">Admission No</p>
            <p className="text-xl font-bold">{student.admissionNo}</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Attendance
            </CardTitle>
            <CalendarCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.attendance.percentage}%</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.attendance.present} / {stats.attendance.total} days
            </p>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${stats.attendance.percentage}%` }}
              ></div>
            </div>
          </CardContent>
        </Card>

        {/* Fees Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Fees Status
            </CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₹{stats.fees.totalPending.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.fees.pendingPayments} pending payment
              {stats.fees.pendingPayments !== 1 ? "s" : ""}
            </p>
            <p className="text-xs text-green-600 mt-1">
              ₹{stats.fees.totalPaid.toLocaleString()} paid
            </p>
          </CardContent>
        </Card>

        {/* Results Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Results
            </CardTitle>
            <BookOpen className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.results.resultsCount}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.results.totalExams} total exams
            </p>
            <Link href="/student/results">
              <Button variant="link" className="p-0 h-auto text-xs mt-2">
                View Results →
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Notifications Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Notifications
            </CardTitle>
            <Bell className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.notifications.unread}</div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.notifications.unread > 0
                ? "unread notification"
                : "all caught up"}
            </p>
            <Link href="/student/announcements">
              <Button variant="link" className="p-0 h-auto text-xs mt-2">
                View All →
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 shadow-lg">
          <CardHeader>
            <CardTitle>Attendance Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: "Present", value: stats.attendance.present },
                      { name: "Absent", value: stats.attendance.absent },
                      { name: "Late", value: stats.attendance.late },
                      { name: "Leave", value: stats.attendance.leave },
                    ].filter((d) => d.value > 0)}
                    dataKey="value"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {["Present", "Absent", "Late", "Leave"].map((name, idx) => (
                      <Cell key={name} fill={ATTENDANCE_COLORS[idx]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 text-sm mt-2">
              <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-400" /> Present ({stats.attendance.present})</div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-400" /> Absent ({stats.attendance.absent})</div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400" /> Late ({stats.attendance.late})</div>
              <div className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400" /> Leave ({stats.attendance.leave})</div>
            </div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 shadow-lg">
          <CardContent className="p-0">
            <CurrentMonthFeeStatusChart
              paid={stats.fees.totalPaid}
              pending={stats.fees.totalPending}
              overdue={0}
              totalExpected={stats.fees.totalPaid + stats.fees.totalPending}
              collectionRate={stats.fees.totalPaid + stats.fees.totalPending > 0 ? Math.round((stats.fees.totalPaid / (stats.fees.totalPaid + stats.fees.totalPending)) * 100) : 0}
            />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Exams */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Upcoming Exams
              </CardTitle>
              <Link href="/student/exams">
                <Button variant="link" className="text-sm">
                  View All →
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recent.upcomingExams.length > 0 ? (
              <div className="space-y-4">
                {recent.upcomingExams.slice(0, 5).map((exam) => (
                  <div
                    key={exam.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{exam.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {exam.class?.name || "N/A"}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                        <span>
                          Start: {format(new Date(exam.startDate), "MMM dd, yyyy")}
                        </span>
                        <span>
                          End: {format(new Date(exam.endDate), "MMM dd, yyyy")}
                        </span>
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-4">
                      {exam.category}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <GraduationCap className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No upcoming exams</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/student/fees">
              <Button variant="outline" className="w-full justify-start">
                <Wallet className="h-4 w-4 mr-2" />
                View Fees
              </Button>
            </Link>
            <Link href="/student/results">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                View Results
              </Button>
            </Link>
            <Link href="/student/homework">
              <Button variant="outline" className="w-full justify-start">
                <BookOpen className="h-4 w-4 mr-2" />
                My Homework
              </Button>
            </Link>
            <Link href="/student/date-sheet">
              <Button variant="outline" className="w-full justify-start">
                <CalendarDays className="h-4 w-4 mr-2" />
                Exam Date Sheet
              </Button>
            </Link>
            <Link href="/student/timetable">
              <Button variant="outline" className="w-full justify-start">
                <CalendarDays className="h-4 w-4 mr-2" />
                Weekly Timetable
              </Button>
            </Link>
            <Link href="/student/study-materials">
              <Button variant="outline" className="w-full justify-start">
                <BookOpen className="h-4 w-4 mr-2" />
                Study Materials
              </Button>
            </Link>
            <Link href="/student/attendance">
              <Button variant="outline" className="w-full justify-start">
                <CalendarCheck className="h-4 w-4 mr-2" />
                Attendance History
              </Button>
            </Link>
            <Link href="/student/notifications">
              <Button variant="outline" className="w-full justify-start">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
            </Link>
            <Link href="/student/announcements">
              <Button variant="outline" className="w-full justify-start">
                <Bell className="h-4 w-4 mr-2" />
                Announcements
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Announcements */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-orange-600" />
                Recent Announcements
              </CardTitle>
              <Link href="/student/announcements">
                <Button variant="link" className="text-sm">
                  View All →
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recent.announcements.length > 0 ? (
              <div className="space-y-3">
                {recent.announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <h4 className="font-medium text-sm text-gray-900">
                      {announcement.title}
                    </h4>
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                      {announcement.content}
                    </p>
                    <p className="text-xs text-gray-400 mt-2">
                      {format(new Date(announcement.createdAt), "MMM dd, yyyy")} •{" "}
                      {announcement.creator?.name || "Admin"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-4 text-gray-500 text-sm">
                No announcements
              </p>
            )}
          </CardContent>
        </Card>

        {/* Recent Attendance */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Recent Attendance
              </CardTitle>
              <Link href="/student/attendance">
                <Button variant="link" className="text-sm">
                  View All →
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {recent.recentAttendance.length > 0 ? (
              <div className="space-y-3">
                {recent.recentAttendance.slice(0, 5).map((attendance) => {
                  const StatusIcon =
                    attendance.status === "PRESENT"
                      ? CheckCircle2
                      : attendance.status === "ABSENT"
                      ? XCircle
                      : AlertCircle;
                  const statusColor =
                    attendance.status === "PRESENT"
                      ? "text-green-600"
                      : attendance.status === "ABSENT"
                      ? "text-red-600"
                      : "text-yellow-600";

                  return (
                    <div
                      key={attendance.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <StatusIcon className={`h-5 w-5 ${statusColor}`} />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {format(new Date(attendance.date), "MMM dd, yyyy")}
                          </p>
                          <p className="text-xs text-gray-500">
                            {attendance.status}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          attendance.status === "PRESENT" ? "default" : "outline"
                        }
                      >
                        {attendance.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center py-4 text-gray-500 text-sm">
                No attendance records
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
