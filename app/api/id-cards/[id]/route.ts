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

    const idCard = await db.idCard.findUnique({
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

    if (!idCard) {
      return NextResponse.json({ error: "ID card not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: idCard });
  } catch (error) {
    console.error("GET /api/id-cards/[id] failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch ID card" },
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
    const existing = await db.idCard.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "ID card not found" }, { status: 404 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (body.cardNo !== undefined) data.cardNo = body.cardNo;
    if (body.issueDate !== undefined) data.issueDate = new Date(body.issueDate);
    if (body.expiryDate !== undefined) data.expiryDate = body.expiryDate ? new Date(body.expiryDate) : null;
    if (body.qrData !== undefined) data.qrData = body.qrData;

    const updated = await db.idCard.update({
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
    console.error("PATCH /api/id-cards/[id] failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update ID card" },
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

    const existing = await db.idCard.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "ID card not found" }, { status: 404 });
    }

    await db.idCard.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "ID card deleted" });
  } catch (error) {
    console.error("DELETE /api/id-cards/[id] failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete ID card" },
      { status: 500 }
    );
  }
}
