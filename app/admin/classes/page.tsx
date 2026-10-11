// app/admin/classes/page.tsx (Server Component)
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { authOption } from "@/app/lib/auth";
import ClassesTableClient from "@/app/components/ClassesTableClient";

export const dynamic = "force-dynamic";

export default async function AdminClassesPage() {
  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const classes = await db.class.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      teacher: { include: { user: { select: { name: true } } } },
      academicSession: true,
    },
  });

  return <ClassesTableClient classes={classes} />;
}
