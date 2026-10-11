import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const subjectId = searchParams.get("subjectId");

    const where: Record<string, unknown> = {};
    if (classId) where.classId = classId;
    if (subjectId) where.subjectId = subjectId;

    const materials = await db.studyMaterial.findMany({
      where,
      include: {
        teacher: {
          include: { user: { select: { name: true } } },
        },
        subject: { select: { name: true } },
        class: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: materials });
  } catch (error) {
    console.error("GET /api/study-materials failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch study materials" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { classId, subjectId, title, description, fileUrl, videoLink, type } = json;

    if (!classId || !subjectId || !title || !type) {
      return NextResponse.json(
        { error: "Missing required fields: classId, subjectId, title, type" },
        { status: 400 }
      );
    }

    let teacherId: string;

    if (session.user.role === "STAFF") {
      const staff = await db.staff.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      if (!staff) {
        return NextResponse.json({ error: "Staff record not found" }, { status: 404 });
      }
      teacherId = staff.id;
    } else {
      const staff = await db.staff.findUnique({
        where: { userId: session.user.id },
        select: { id: true },
      });
      teacherId = staff?.id ?? json.teacherId;
      if (!teacherId) {
        return NextResponse.json({ error: "teacherId is required" }, { status: 400 });
      }
    }

    const created = await db.studyMaterial.create({
      data: {
        classId,
        subjectId,
        teacherId,
        title,
        description: description ?? null,
        fileUrl: fileUrl ?? null,
        videoLink: videoLink ?? null,
        type,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/study-materials failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
