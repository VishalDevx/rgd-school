import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOption } from "@/app/lib/auth";
import { db } from "@/lib/db";
import StaffResultsAdd from "@/app/components/StaffResultsAdd";

export default async function ResultUploadPage() {
  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "STAFF") {
    redirect("/login");
  }

  const staff = await db.staff.findUnique({
    where: { userId: session.user.id },
  });

  if (!staff) {
    return (
      <div className="p-6">
        <div className="border p-6  text-center text-muted-foreground rounded">
          No staff record found.
        </div>
      </div>
    );
  }

  const classes = await db.class.findMany({
    where: { teacherId: staff.id },
    include: {
      students: {
        include: {
          user: {
            select: { name: true, email: true },
          },
        },
        orderBy: { rollNumber: "asc" },
      },
      subjects: true,
    },
    orderBy: { name: "asc" },
  });

  const exams = await db.exam.findMany({
    where: {
      classId: { in: classes.map((c) => c.id) },
    },
    orderBy: { startDate: "asc" },
  });

  return (
    <StaffResultsAdd
      staffName={session.user.name ?? "Staff"}
      classes={classes}
      exams={exams}
    />
  );
}
