import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.feeCategory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Fee category not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body || !body.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const updated = await db.feeCategory.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description ?? null,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("PUT /api/fees/categories/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.feeCategory.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Fee category not found" }, { status: 404 });
    }

    await db.feeCategory.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Fee category deleted" });
  } catch (error) {
    console.error("DELETE /api/fees/categories/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
