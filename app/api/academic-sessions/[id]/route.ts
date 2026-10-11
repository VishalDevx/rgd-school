import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await db.academicSession.findUnique({ where: { id } });
    if (!session) {
      return NextResponse.json({ error: "Academic session not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    console.error("GET /api/academic-sessions/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const existing = await db.academicSession.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Academic session not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // If setting this session as active, deactivate all others
    if (body.isActive === true) {
      await db.academicSession.updateMany({
        where: { isActive: true, id: { not: id } },
        data: { isActive: false },
      });
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.isActive !== undefined) data.isActive = body.isActive;

    const updated = await db.academicSession.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/academic-sessions/[id] failed:", error);
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
    const existing = await db.academicSession.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Academic session not found" }, { status: 404 });
    }

    await db.academicSession.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Academic session deleted" });
  } catch (error) {
    console.error("DELETE /api/academic-sessions/[id] failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
