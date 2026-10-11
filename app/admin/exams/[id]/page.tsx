import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOption } from "@/app/lib/auth";
import { db } from "@/lib/db";
import ExamDetailClient from "@/app/components/ExamDetailClient";
import type { Row } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ExamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "ADMIN") redirect("/login");

  const exam = await db.exam.findUnique({
    where: { id },
    include: {
      class: true,
      createdBy: { select: { name: true } },
      dateSheet: {
        include: { subject: true },
        orderBy: { examDate: "asc" },
      },
      results: {
        select: { id: true },
      },
    },
  });

  if (!exam) redirect("/admin/exams");

  const serialized = {
    ...exam,
    startDate: exam.startDate.toISOString(),
    endDate: exam.endDate.toISOString(),
    createdAt: exam.createdAt.toISOString(),
    dateSheet: exam.dateSheet.map((d: Row) => ({
      ...d,
      examDate: d.examDate.toISOString(),
      startTime: d.startTime.toISOString(),
      endTime: d.endTime.toISOString(),
    })),
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <ExamDetailClient exam={serialized} />
    </div>
  );
}
