import { getServerSession } from "next-auth";
import { redirect, notFound } from "next/navigation";
import { authOption } from "@/app/lib/auth";
import { db } from "@/lib/db";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import Link from "next/link";
import type { Row } from "@/lib/types";
import {
  Users,
  BookOpen,
  FileText,
  CalendarCheck,
  GraduationCap,
  Hash,
  Mail,
} from "lucide-react";

// PageProps with Promise-wrapped params
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StaffClassDetailPage({ params }: PageProps) {
  const { id } = await params; // await because params is a Promise

  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "STAFF") redirect("/login");

  // Get staff record
  const staff = await db.staff.findUnique({
    where: { userId: session.user.id },
  });

  if (!staff) return notFound();

  const cls = await db.class.findFirst({
    where: { id, teacherId: staff.id },
    include: {
      students: {
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
        orderBy: { rollNumber: "asc" },
      },
      subjects: {
        include: {
          teacher: {
            include: {
              user: {
                select: { name: true },
              },
            },
          },
        },
      },
      academicSession: true,
      _count: {
        select: {
          exams: true,
        },
      },
    },
  });

  if (!cls) return notFound();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{cls.name}</h1>
          <p className="text-gray-500 mt-1">
            Grade {cls.grade} • Section {cls.section || "N/A"}
            {cls.academicSession && ` • ${cls.academicSession.name}`}
          </p>
        </div>
        <Link href="/staff/classes">
          <Button variant="outline">Back to Classes</Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Students
            </CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cls.students.length}</div>
            <p className="text-xs text-gray-500 mt-1">Total enrolled</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Subjects
            </CardTitle>
            <BookOpen className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cls.subjects.length}</div>
            <p className="text-xs text-gray-500 mt-1">Teaching</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Exams
            </CardTitle>
            <FileText className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{cls._count.exams}</div>
            <p className="text-xs text-gray-500 mt-1">Scheduled</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subjects */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Subjects ({cls.subjects.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cls.subjects.length > 0 ? (
              <div className="space-y-3">
                {cls.subjects.map((subject: Row) => (
                  <div
                    key={subject.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{subject.name}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Code: {subject.code}
                      </p>
                      {subject.teacher && (
                        <p className="text-xs text-gray-400 mt-1">
                          Teacher: {subject.teacher.user.name}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline">{subject.code}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-8 text-gray-500 text-sm">
                No subjects assigned
              </p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href={`/staff/attendance?classId=${cls.id}`}>
              <Button variant="outline" className="w-full justify-start">
                <CalendarCheck className="h-4 w-4 mr-2" />
                Mark Attendance
              </Button>
            </Link>
            <Link href={`/staff/exams?classId=${cls.id}`}>
              <Button variant="outline" className="w-full justify-start">
                <FileText className="h-4 w-4 mr-2" />
                Manage Exams
              </Button>
            </Link>
            <Link href={`/staff/results?classId=${cls.id}`}>
              <Button variant="outline" className="w-full justify-start">
                <GraduationCap className="h-4 w-4 mr-2" />
                Add Results
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Students List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Students ({cls.students.length})
            </CardTitle>
            <Link href={`/staff/attendance?classId=${cls.id}`}>
              <Button variant="outline" size="sm">
                <CalendarCheck className="h-4 w-4 mr-2" />
                Mark Attendance
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {cls.students.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Roll No
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Name
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Email
                    </th>
                    <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cls.students.map((student: Row) => (
                    <tr
                      key={student.id}
                      className="border-b hover:bg-gray-50 transition-colors"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">{student.rollNumber}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <p className="font-medium text-gray-900">
                          {student.user.name}
                        </p>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-gray-400" />
                          <span className="text-sm text-gray-600">
                            {student.user.email}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <Link href={`/staff/results?studentId=${student.id}`}>
                          <Button variant="link" size="sm" className="text-xs">
                            View Results
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-500">No students enrolled</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
