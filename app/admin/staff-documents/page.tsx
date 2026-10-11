import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOption } from "@/app/lib/auth";
import { db } from "@/lib/db";
import StaffDocumentsTable from "@/app/components/StaffDocumentsTable";

export const dynamic = "force-dynamic";

export default async function StaffDocumentsPage() {
  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const [documents, staffMembers] = await Promise.all([
    db.staffDocument.findMany({
      include: {
        staff: {
          select: {
            id: true,
            staffId: true,
            designation: true,
            user: { select: { name: true, email: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.staff.findMany({
      select: {
        id: true,
        staffId: true,
        user: { select: { name: true } },
      },
      orderBy: { staffId: "asc" },
    }),
  ]);

  const serialized = documents.map((d) => ({
    ...d,
    createdAt: d.createdAt.toISOString(),
  }));

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800">Staff Documents</h1>
      <StaffDocumentsTable documents={serialized} staffMembers={staffMembers} />
    </div>
  );
}
