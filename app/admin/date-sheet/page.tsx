// app/admin/date-sheet/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { db } from "@/lib/db";
import { authOption } from "@/app/lib/auth";

import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import DateSheetTable from "@/app/components/DateSheetTable";

export const dynamic = "force-dynamic";

export default async function AdminDateSheetPage() {
  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const dateSheets = await db.examDateSheet.findMany({
    include: { exam: true, class: true, subject: true },
    orderBy: [{ classId: "asc" }, { examDate: "asc" }],
  });

  const groupedByClass = dateSheets.reduce((acc: Record<string, typeof dateSheets>, ds) => {
    const className = ds.class?.name || "Unknown Class";
    if (!acc[className]) acc[className] = [];
    acc[className].push(ds);
    return acc;
  }, {});

  return (
    <div className="min-h-screen p-6 space-y-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight text-gray-800">Exam Datesheet</h1>
        <Button asChild variant="default" size="sm">
          <Link href="/admin/date-sheet/new">+ Add Timetable</Link>
        </Button>
      </div>

      <Card className="shadow-xl border border-gray-200 rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-700">All Classes</CardTitle>
        </CardHeader>

        <CardContent className="overflow-x-auto">
          <DateSheetTable groupedByClass={groupedByClass} />
          {dateSheets.length === 0 && (
            <p className="text-center py-4 text-gray-500">No exams scheduled yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
