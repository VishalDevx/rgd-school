import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import StudentsTable from "./StudentTables";
import { authOption } from "@/app/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";

export const dynamic = "force-dynamic";

export default async function AdminStudentsPage() {
  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const [students, totalCount, activeCount, classCount] = await Promise.all([
    db.student.findMany({
      include: { user: true, class: true },
      orderBy: { admissionDate: "desc" },
    }),
    db.student.count(),
    db.student.count({ where: { active: true } }),
    db.class.count(),
  ]);

  return (
    <div className="p-6 md:p-8 min-h-screen space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-xl rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Students</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalCount}</div></CardContent>
        </Card>
        <Card className="shadow-xl rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{activeCount}</div></CardContent>
        </Card>
        <Card className="shadow-xl rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Inactive</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{totalCount - activeCount}</div></CardContent>
        </Card>
        <Card className="shadow-xl rounded-xl">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Classes</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{classCount}</div></CardContent>
        </Card>
      </div>

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-gray-800">Students</h1>
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/students/import">Bulk Import</Link>
          </Button>
          <Button asChild>
            <Link href="/admin/students/new">+ Add Student</Link>
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl border p-4">
        <StudentsTable students={students} />
      </div>
    </div>
  );
}
