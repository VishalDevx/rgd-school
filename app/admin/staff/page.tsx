import { redirect } from "next/navigation";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { db } from "@/lib/db";
import { authOption } from "@/app/lib/auth";
import { Card, CardHeader, CardTitle, CardContent } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import StaffTable from "@/app/components/StaffTable";
import { Badge } from "@/app/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function AdminStaffPage() {
  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const [staff, totalCount, activeCount] = await Promise.all([
    db.staff.findMany({
      include: { user: true },
      orderBy: { joinDate: "desc" },
    }),
    db.staff.count(),
    db.staff.count({ where: { active: true } }),
  ]);

  return (
    <div className="p-6 space-y-6 min-h-screen">
      <div className="flex gap-4">
        <Card className="shadow-xl rounded-xl flex-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Staff</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{totalCount}</div></CardContent>
        </Card>
        <Card className="shadow-xl rounded-xl flex-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Active</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-green-600">{activeCount}</div></CardContent>
        </Card>
        <Card className="shadow-xl rounded-xl flex-1">
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Inactive</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold text-red-600">{totalCount - activeCount}</div></CardContent>
        </Card>
      </div>

      <Card className="shadow-xl rounded-xl border border-gray-200">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
          <CardTitle className="text-2xl font-bold tracking-tight text-gray-800">Staff</CardTitle>
          <Button asChild className="mt-2 md:mt-0">
            <Link href="/admin/staff/new">+ New Staff</Link>
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto rounded-lg border border-gray-200">
          <StaffTable staff={staff} />
        </CardContent>
      </Card>
    </div>
  );
}
