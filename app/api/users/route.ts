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
  const role = searchParams.get("role");
  const search = searchParams.get("search");

  const where: Record<string, unknown> = {};
  if (role && ["ADMIN", "STAFF", "STUDENT"].includes(role)) {
    where.role = role;
  }
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  const users = await db.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      phone: true,
      lastLogin: true,
      createdAt: true,
      staff: { select: { staffId: true } },
      student: { select: { admissionNo: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: users });
}
