import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const isActive = searchParams.get("isActive");

  const where: Record<string, unknown> = {};
  if (isActive === "true") where.isActive = true;
  if (isActive === "false") where.isActive = false;

  const assignments = await db.transportAssignment.findMany({
    where,
    include: {
      student: {
        include: {
          user: { select: { name: true, email: true } },
          class: { select: { name: true, id: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(assignments);
}
