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
  Users,
  CalendarCheck,
  BookOpen,
  ClipboardList,
  TrendingUp,
  GraduationCap,
  Bell,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  CalendarDays,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/app/components/ui/button";
import AttendanceTrendCharts from "@/app/components/charts/attendanceTrendCharts";
import { CurrentMonthFeeStatusChart } from "@/app/components/charts/DashboardFeeCharts";

interface DashboardData {
  staff: {
    id: string;
    designation: string;
    joinDate: string;
    active: boolean;
    user: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      image: string | null;
    };
  };
  stats: {
    totalClasses: number;
    totalStudents: number;
    attendanceToday: number;
    totalExams: number;
    upcomingExams: number;
    pastExams: number;
    resultsCount: number;
    subjectsCount: number;
  };
  classes: Array<{
    id: string;
    name: string;
    grade: string;
    section: string | null;
    students: unknown[];
    subjects: unknown[];
  }>;
  upcomingExams: Array<{
    id: string;
    name: string;
    category: string;
    startDate: string;
    class: { name: string } | null;
  }>;
  recentAttendance: Array<{
    id: string;
    date: string;
    status: "PRESENT" | "ABSENT" | "LATE" | "LEAVE";
    student: { user: { name: string } };
    class: { name: string };
  }>;
  announcements: Array<{
    id: string;
    title: string;
    content: string;
    createdAt: string;
    creator: { name: string } | null;
  }>;
  subjects: unknown[];
  charts: {
    attendanceTrend: { date: string; percentage: number }[];
    feeOverview: { paid: number; pending: number; overdue: number };
  };
}

export default function StaffDashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/staff/dashboard");
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

  const { staff, stats, classes, upcomingExams, recentAttendance, announcements, charts } = data;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
    <div>
            <h1 className="text-2xl font-bold mb-2">
              Welcome back, {session?.user?.name}!
            </h1>
            <p className="text-purple-100">{staff.designation}</p>
            <p className="text-sm text-purple-200 mt-1">
              Joined: {format(new Date(staff.joinDate), "MMM dd, yyyy")}
            </p>
          </div>
          <div className="bg-white/20 rounded-lg p-4 backdrop-blur-sm">
            <p className="text-sm text-purple-100">Status</p>
            <Badge className={staff.active ? "bg-green-500" : "bg-gray-500"}>
              {staff.active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Classes Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              My Classes
            </CardTitle>
            <BookOpen className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClasses}</div>
            <p className="text-xs text-gray-500 mt-1">Classes assigned</p>
            <Link href="/staff/classes">
              <Button variant="link" className="p-0 h-auto text-xs mt-2">
                View Classes →
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Students Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Students
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs text-gray-500 mt-1">Across all classes</p>
          </CardContent>
        </Card>

        {/* Attendance Today Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Attendance Today
            </CardTitle>
            <CalendarCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.attendanceToday}</div>
            <p className="text-xs text-gray-500 mt-1">Records marked</p>
            <Link href="/staff/attendance">
              <Button variant="link" className="p-0 h-auto text-xs mt-2">
                Mark Attendance →
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Exams Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Exams
            </CardTitle>
            <ClipboardList className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcomingExams}</div>
            <p className="text-xs text-gray-500 mt-1">Upcoming exams</p>
            <Link href="/staff/exams">
              <Button variant="link" className="p-0 h-auto text-xs mt-2">
                Manage Exams →
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 shadow-lg">
          <CardHeader>
            <CardTitle>Attendance Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <AttendanceTrendCharts data={charts.attendanceTrend} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2 shadow-lg">
          <CardHeader>
            <CardTitle>Fee Status</CardTitle>
          </CardHeader>
          <CardContent>
            <CurrentMonthFeeStatusChart
              paid={charts.feeOverview.paid}
              pending={charts.feeOverview.pending}
              overdue={charts.feeOverview.overdue}
              totalExpected={charts.feeOverview.paid + charts.feeOverview.pending + charts.feeOverview.overdue}
              collectionRate={charts.feeOverview.paid + charts.feeOverview.pending > 0 ? Math.round((charts.feeOverview.paid / (charts.feeOverview.paid + charts.feeOverview.pending + charts.feeOverview.overdue)) * 100) : 0}
            />
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Classes */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-purple-600" />
                My Classes
              </CardTitle>
              <Link href="/staff/classes">
                <Button variant="link" className="text-sm">
                  View All →
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {classes.length > 0 ? (
              <div className="space-y-4">
                {classes.slice(0, 5).map((cls) => (
                  <div
                    key={cls.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{cls.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {cls.students.length} students • {cls.subjects.length} subjects
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{cls.grade}</Badge>
                        {cls.section && (
                          <Badge variant="outline">Section {cls.section}</Badge>
                        )}
                      </div>
                    </div>
                    <Link href={`/staff/classes/${cls.id}`}>
                      <Button variant="outline" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No classes assigned</p>
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
            <Link href="/staff/attendance">
              <Button variant="outline" className="w-full justify-start">
                <CalendarCheck className="h-4 w-4 mr-2" />
                Mark Attendance
              </Button>
            </Link>
            <Link href="/staff/staff-attendance">
              <Button variant="outline" className="w-full justify-start">
                <CalendarCheck className="h-4 w-4 mr-2" />
                My Attendance
              </Button>
            </Link>
            <Link href="/staff/homework/new">
              <Button variant="outline" className="w-full justify-start">
                <ClipboardList className="h-4 w-4 mr-2" />
                New Homework
              </Button>
            </Link>
            <Link href="/staff/study-materials">
              <Button variant="outline" className="w-full justify-start">
                <BookOpen className="h-4 w-4 mr-2" />
                Study Materials
              </Button>
            </Link>
            <Link href="/staff/timetable">
              <Button variant="outline" className="w-full justify-start">
                <CalendarDays className="h-4 w-4 mr-2" />
                My Timetable
              </Button>
            </Link>
            <Link href="/staff/results">
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Add Results
              </Button>
            </Link>
            <Link href="/staff/notifications">
              <Button variant="outline" className="w-full justify-start">
                <Bell className="h-4 w-4 mr-2" />
                Notifications
              </Button>
            </Link>
            <Link href="/staff/announcements">
              <Button variant="outline" className="w-full justify-start">
                <Bell className="h-4 w-4 mr-2" />
                Announcements
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Exams & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Exams */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                Upcoming Exams
              </CardTitle>
              <Link href="/staff/exams">
                <Button variant="link" className="text-sm">
                  View All →
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {upcomingExams.length > 0 ? (
              <div className="space-y-3">
                {upcomingExams.map((exam) => (
                  <div
                    key={exam.id}
                    className="p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <h4 className="font-medium text-sm text-gray-900">{exam.name}</h4>
                    <p className="text-xs text-gray-500 mt-1">
                      {exam.class?.name || "N/A"}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500">
                        {format(new Date(exam.startDate), "MMM dd, yyyy")}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {exam.category}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No upcoming exams</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Announcements */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-blue-600" />
                Recent Announcements
              </CardTitle>
              <Link href="/staff/announcements">
                <Button variant="link" className="text-sm">
                  View All →
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {announcements.length > 0 ? (
              <div className="space-y-3">
                {announcements.map((announcement) => (
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
              <div className="text-center py-8 text-gray-500">
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No announcements</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Attendance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Recent Attendance Records
            </CardTitle>
            <Link href="/staff/attendance">
              <Button variant="link" className="text-sm">
                View All →
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {recentAttendance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Date
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Student
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Class
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentAttendance.map((record) => {
                    const StatusIcon =
                      record.status === "PRESENT"
                        ? CheckCircle2
                        : record.status === "ABSENT"
                        ? XCircle
                        : AlertCircle;
                    const statusColor =
                      record.status === "PRESENT"
                        ? "text-green-600"
                        : record.status === "ABSENT"
                        ? "text-red-600"
                        : "text-yellow-600";

                    return (
                      <tr
                        key={record.id}
                        className="border-b hover:bg-gray-50 transition-colors"
                      >
                        <td className="py-4 px-4 text-sm">
                          {format(new Date(record.date), "MMM dd, yyyy")}
                        </td>
                        <td className="py-4 px-4">
                          <p className="font-medium text-gray-900">
                            {record.student.user.name}
                          </p>
                        </td>
                        <td className="py-4 px-4 text-sm text-gray-600">
                          {record.class.name}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <StatusIcon className={`h-4 w-4 ${statusColor}`} />
                            <Badge
                              variant={
                                record.status === "PRESENT" ? "default" : "outline"
                              }
                            >
                              {record.status}
                            </Badge>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CalendarCheck className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No attendance records</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
