import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOption } from "@/app/lib/auth";
import { db } from "@/lib/db";
import { FeeSlipClient } from "@/app/components/FeeSlipClient";

export default async function StudentFeeSlipPage() {
  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "STUDENT") redirect("/login");

  const student = await db.student.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  if (!student) redirect("/student/dashboard");

  return <FeeSlipClient studentId={student.id} />;
}
