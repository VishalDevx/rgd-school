import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";
import { ExamCategory } from "@/lib/enums";

// ---------- Types ----------
interface CreateExamBody {
  name: string;              // "Test-1", "Half Yearly"
  classId: string;
  category: ExamCategory;    // UNIT_TEST | HALF_YEARLY | ANNUAL
  sequence?: number;         // 1,2 only for UNIT_TEST
  startDate: string;
  endDate: string;
}

// ---------- GET ----------
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const classId = searchParams.get("classId");

  const exams = await db.exam.findMany({
    where: classId ? { classId } : undefined,
    select: {
      id: true,
      name: true,
      category: true,
      sequence: true,
      isLocked: true,
      startDate: true,
      endDate: true,
    },
    orderBy: [
      { category: "asc" },
      { sequence: "asc" },
    ],
  });

  return NextResponse.json({ data: exams });
}

// ---------- POST ----------
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOption);

  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body: CreateExamBody | null = await req.json().catch(() => null);

  if (
    !body?.name ||
    !body?.classId ||
    !body?.category ||
    !body?.startDate ||
    !body?.endDate
  ) {
    return new NextResponse("Invalid payload", { status: 400 });
  }


  if (body.category === "UNIT_TEST" && !body.sequence) {
    return new NextResponse("Sequence required for UNIT_TEST", { status: 400 });
  }

  if (body.category !== "UNIT_TEST" && body.sequence) {
    return new NextResponse("Sequence not allowed for this exam type", { status: 400 });
  }

  // Verify class
  const classExists = await db.class.findUnique({
    where: { id: body.classId },
  });

  if (!classExists) {
    return new NextResponse("Class not found", { status: 404 });
  }

  // Prevent duplicate exams (critical)
  const duplicate = await db.exam.findFirst({
    where: {
      classId: body.classId,
      category: body.category,
      sequence: body.sequence ?? null,
    },
  });

  if (duplicate) {
    return new NextResponse("Exam already exists", { status: 409 });
  }

  const exam = await db.exam.create({
    data: {
      name: body.name,
      classId: body.classId,
      category: body.category,
      sequence: body.sequence ?? null,
      startDate: new Date(body.startDate),
      endDate: new Date(body.endDate),
      createdById: session.user.id,
    },
  });

  return NextResponse.json(exam, { status: 201 });
}
