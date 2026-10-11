import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function GET() {
  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const categories = await db.expenseCategory.findMany({
    orderBy: { name: "asc" },
  });

  return NextResponse.json(categories);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || !body.name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const created = await db.expenseCategory.create({
    data: {
      name: body.name,
      description: body.description ?? null,
    },
  });

  return NextResponse.json(created, { status: 201 });
}
