import StaffAttendanceUI from "@/app/components/StaffAttendanceUI";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authOption } from "@/app/lib/auth";

export default async function StaffAttendancePage() {
  const session = await getServerSession(authOption);

  if (!session?.user || session.user.role !== "STAFF") {
    redirect("/login");
  }

  // STAFF record
  const staff = await db.staff.findUnique({
    where: { userId: session.user.id },
  });

  if (!staff) {
    return (
      <div className="p-6">
        <div className="border p-6 text-center text-muted-foreground rounded">
          No staff record found.
        </div>
      </div>
    );
  }

  // CLASSES assigned
  const classes = await db.class.findMany({
    where: { teacherId: staff.id },
    include: {
      students: { include: { user: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // ---FIX: Guarantee classes is always an array ---
  const safeClasses = Array.isArray(classes) ? classes : [];

  return (
    <StaffAttendanceUI
      classes={safeClasses}
      staffName={session.user.name ?? "Staff"}
      staffId={staff.id}
    />
  );
}
