import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOption } from "@/app/lib/auth";
import UserManagementTable from "@/app/components/UserManagementTable";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const { db } = await import("@/lib/db");

  const [
    totalUsers,
    activeUsers,
    adminCount,
    staffCount,
    studentCount,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { isActive: true } }),
    db.user.count({ where: { role: "ADMIN" } }),
    db.user.count({ where: { role: "STAFF" } }),
    db.user.count({ where: { role: "STUDENT" } }),
  ]);

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800">User Management</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Total Users" value={totalUsers} color="text-gray-900" />
        <StatCard label="Active" value={activeUsers} color="text-green-600" />
        <StatCard label="Admins" value={adminCount} color="text-blue-600" />
        <StatCard label="Staff" value={staffCount} color="text-purple-600" />
        <StatCard label="Students" value={studentCount} color="text-amber-600" />
      </div>

      <UserManagementTable />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
