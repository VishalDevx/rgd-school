import { authOption } from "@/app/lib/auth";
import { SubjectSchema, SubjectType } from "@/app/lib/schemas/subject.schema";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json().catch(() => null);
    if (!json) {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = SubjectSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    // Normalize and sanitize incoming data
    const body: SubjectType = parsed.data;

    // Convert empty-string or "none" values to null so Prisma doesn't attempt to insert ""
    const normalizedClassId =
      !body.classId || body.classId === "" || body.classId === "none"
        ? null
        : body.classId;
    const normalizedTeacherId =
      !body.teacherId || body.teacherId === "" || body.teacherId === "none"
        ? null
        : body.teacherId;

    console.log("Creating subject with:", {
      name: body.name,
      code: body.code,
      classId: normalizedClassId,
      teacherId: normalizedTeacherId,
    });

    // If a classId was provided, ensure the class actually exists
    if (normalizedClassId) {
      const cls = await db.class.findUnique({
        where: { id: normalizedClassId },
        select: { id: true },
      });
      if (!cls) {
        return NextResponse.json(
          { error: "Invalid classId: class does not exist" },
          { status: 400 }
        );
      }
    }

    // If a teacherId was provided, ensure the staff exists
    if (normalizedTeacherId) {
      const staff = await db.staff.findUnique({
        where: { id: normalizedTeacherId },
        select: { id: true },
      });
      if (!staff) {
        return NextResponse.json(
          { error: "Invalid teacherId: staff does not exist" },
          { status: 400 }
        );
      }
    }

    const created = await db.subject.create({
      data: {
        name: body.name,
        code: body.code,
        classId: normalizedClassId,
        teacherId: normalizedTeacherId,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/subjects failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}


export async function GET(req:NextRequest){
    try {
        const subjects = await db.subject.findMany({
        })
     return NextResponse.json({ success: true, data: subjects });
    } catch (error) {
        return NextResponse.json(
      { success: false, error: "Failed to fetch classes" },
      { status: 500 }
    );
    }
}