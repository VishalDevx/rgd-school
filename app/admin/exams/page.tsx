// app/admin/exams/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/db";
import { authOption } from "@/app/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import ExamsTable from "@/app/components/ExamsTable";

export const dynamic = "force-dynamic";

type ExamWithClass = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  category: string;
  class: { id: string; name: string } | null;
};

export default async function AdminExamsPage() {
  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const exams = (await db.exam.findMany({
    include: { class: true },
    orderBy: { startDate: "desc" },
  })) as ExamWithClass[];

  return (
    <div className="min-h-screen p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-gray-800">Exams</h1>
        <Button asChild variant="default" size="sm">
          <Link href="/admin/exams/new">+ New Exam</Link>
        </Button>
      </div>

      {/* Exams Table Card */}
      <Card className="shadow-xl border border-gray-200 rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-700">Upcoming & Past Exams</CardTitle>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <ExamsTable exams={exams} />
          {exams.length === 0 && (
            <p className="text-center py-4 text-gray-500">No exams scheduled yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
