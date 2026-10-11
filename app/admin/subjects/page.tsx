import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

import { Card, CardHeader, CardTitle, CardContent } from "@/app/components/ui/card";
import { authOption } from "@/app/lib/auth";
import SubjectsTableClient from "@/app/components/SubjectsTableClient";

export const dynamic = "force-dynamic";

export default async function AdminSubjectsPage() {
  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const subjects = await db.subject.findMany({
    include: {
      teacher: {
        include: {
          user: { select: { name: true } },
        },
      },
    },
  });

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Subjects</h1>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold">All Subjects</CardTitle>
        </CardHeader>
        <CardContent>
          <SubjectsTableClient subjects={subjects} />
        </CardContent>
      </Card>
    </div>
  );
}
