import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/app/components/ui/card";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import {
  BookOpen,
  Users,
  GraduationCap,
  CalendarCheck,
  FileText,
  ArrowRight,
} from "lucide-react";
import { authOption } from "@/app/lib/auth";
import type { Row } from "@/lib/types";

export default async function StaffClassesPage() {
  const session = await getServerSession(authOption);

  if (!session?.user || session.user.role !== "STAFF") {
    redirect("/login");
  }

  // Fetch the staff record linked to the logged-in user
  const staff = await db.staff.findUnique({
    where: { userId: session.user.id },
  });

  if (!staff) {
    return (
      <div className="p-6">
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-muted-foreground">
            No staff record found for your account.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Fetch classes assigned to this staff
  const classes = await db.class.findMany({
    where: { teacherId: staff.id },
    include: {
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
      students: {
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
      },
      academicSession: true,
      _count: {
        select: {
          students: true,
          subjects: true,
          exams: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Classes</h1>
          <p className="text-gray-500 mt-1">
            Manage your assigned classes and students
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          {classes.length} class{classes.length !== 1 ? "es" : ""} assigned
        </Badge>
      </div>

      {/* No Classes assigned */}
      {classes.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-12 text-center">
            <BookOpen className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No Classes Assigned
            </h3>
            <p className="text-gray-500">
              You are not assigned to any class yet. Contact the administrator.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Classes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classes.map((cls) => (
          <Card
            key={cls.id}
            className="hover:shadow-lg transition-shadow flex flex-col"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg mb-2">{cls.name}</CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">{cls.grade}</Badge>
                    {cls.section && (
                      <Badge variant="outline">Section {cls.section}</Badge>
                    )}
                    {cls.academicSession && (
                      <Badge variant="outline" className="text-xs">
                        {cls.academicSession.name}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex-1 flex flex-col">
              <div className="space-y-3 mb-4">
                {/* Students Count */}
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-blue-600" />
                  <span className="text-gray-600">
                    <span className="font-semibold">{cls._count.students}</span>{" "}
                    student{cls._count.students !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Subjects Count */}
                <div className="flex items-center gap-2 text-sm">
                  <BookOpen className="h-4 w-4 text-purple-600" />
                  <span className="text-gray-600">
                    <span className="font-semibold">{cls._count.subjects}</span>{" "}
                    subject{cls._count.subjects !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Exams Count */}
                <div className="flex items-center gap-2 text-sm">
                  <FileText className="h-4 w-4 text-orange-600" />
                  <span className="text-gray-600">
                    <span className="font-semibold">{cls._count.exams}</span> exam
                    {cls._count.exams !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {/* Subjects List */}
              {cls.subjects.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-2">Subjects:</p>
                  <div className="flex flex-wrap gap-1">
                    {cls.subjects.slice(0, 3).map((subj: Row) => (
                      <Badge key={subj.id} variant="outline" className="text-xs">
                        {subj.name}
                      </Badge>
                    ))}
                    {cls.subjects.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{cls.subjects.length - 3} more
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-auto pt-4 border-t space-y-2">
                <Link href={`/staff/classes/${cls.id}`} className="block">
                  <Button variant="default" className="w-full">
                    View Details
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </Link>
                <div className="grid grid-cols-2 gap-2">
                  <Link href={`/staff/attendance?classId=${cls.id}`}>
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      <CalendarCheck className="h-3 w-3 mr-1" />
                      Attendance
                    </Button>
                  </Link>
                  <Link href={`/staff/results?classId=${cls.id}`}>
                    <Button variant="outline" size="sm" className="w-full text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      Results
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      {classes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Students
              </CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {classes.reduce((sum, cls) => sum + cls._count.students, 0)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Across all classes</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Subjects
              </CardTitle>
              <BookOpen className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {classes.reduce((sum, cls) => sum + cls._count.subjects, 0)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Teaching</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                Total Exams
              </CardTitle>
              <FileText className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {classes.reduce((sum, cls) => sum + cls._count.exams, 0)}
              </div>
              <p className="text-xs text-gray-500 mt-1">Scheduled</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
