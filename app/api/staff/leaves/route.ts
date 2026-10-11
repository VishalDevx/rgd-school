import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function GET() {
  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "STAFF") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const staff = await db.staff.findUnique({ where: { userId: session.user.id } });
  if (!staff) return NextResponse.json({ error: "Staff not found" }, { status: 404 });

  const leaves = await db.leave.findMany({
    where: { staffId: staff.id },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: leaves });
}
