import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOption } from "@/app/lib/auth";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const certificate = await db.certificate.findUnique({
      where: { id },
      include: {
        student: {
          include: {
            user: { select: { name: true, email: true } },
            class: { select: { name: true } },
          },
        },
        staff: {
          include: {
            user: { select: { name: true, email: true } },
          },
        },
      },
    });

    if (!certificate) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: certificate });
  } catch (error) {
    console.error("GET /api/certificates/[id] failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch certificate" },
      { status: 500 }
    );
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
    const existing = await db.certificate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (body.type !== undefined) data.type = body.type;
    if (body.content !== undefined) data.content = body.content;
    if (body.remarks !== undefined) data.remarks = body.remarks;
    if (body.issueDate !== undefined) data.issueDate = new Date(body.issueDate);

    const updated = await db.certificate.update({
      where: { id },
      data,
      include: {
        student: {
          include: { user: { select: { name: true } }, class: { select: { name: true } } },
        },
        staff: {
          include: { user: { select: { name: true } } },
        },
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("PATCH /api/certificates/[id] failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update certificate" },
      { status: 500 }
    );
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

    const existing = await db.certificate.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json(
        { error: "Certificate not found" },
        { status: 404 }
      );
    }

    await db.certificate.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Certificate deleted" });
  } catch (error) {
    console.error("DELETE /api/certificates/[id] failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete certificate" },
      { status: 500 }
    );
  }
}
