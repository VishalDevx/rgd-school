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
            user: { select: { name: true } },
            class: { select: { name: true } },
          },
        },
        staff: {
          include: { user: { select: { name: true } } },
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
    console.error("GET /api/certificates/[id]/pdf failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch certificate data" },
      { status: 500 }
    );
  }
}
