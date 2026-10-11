import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { ClassPayloadSchema, ClassPayload } from "@/app/lib/schemas/class.schema";
import { authOption } from "@/app/lib/auth";

export async function GET() {
  try {
    const classes = await db.class.findMany({
      include: {
        teacher: true,
        students: true,
        exams: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: classes });
  } catch (error) {
    console.error("GET /api/classes failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch classes" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Authorization check
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    // Parse body safely
    const json = await req.json().catch(() => null);
    if (!json) return new NextResponse("Invalid JSON", { status: 400 });

    const parsed = ClassPayloadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const body: ClassPayload = parsed.data;

    // Ensure academicSessionId is provided
    if (!body.academicSessionId) {
      return NextResponse.json(
        { error: "academicSessionId is required" },
        { status: 400 }
      );
    }

    // Create class
    const created = await db.class.create({
      data: {
        name: body.name,
        grade: body.grade,
        section: body.section ?? null,
        gradeCode: body.gradeCode ?? null,
        teacherId: body.teacherId ?? null,
        academicSessionId: body.academicSessionId,
      },
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error) {
    console.error("POST /api/classes failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
