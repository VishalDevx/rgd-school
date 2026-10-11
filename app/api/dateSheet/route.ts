import { authOption } from "@/app/lib/auth";
import { getServerSession } from "next-auth/next";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { _success } from "zod/v4/core";


interface CreateTimeTable {
  examId: string;
  classId: string;
  subjectId: string;
  examDate: string;
  startTime: string;
  endTime: string;
  room?: string; // optional
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);

    if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body: CreateTimeTable | null = await req.json().catch(() => null);
    if (
      !body?.examId ||
      !body?.classId ||
      !body?.subjectId ||
      !body?.examDate ||
      !body?.startTime ||
      !body?.endTime
    ) {
      return new NextResponse("Invalid payload", { status: 400 });
    }

    // Validate existence of related records
    const examExists = await db.exam.findUnique({ where: { id: body.examId } });
    if (!examExists) return new NextResponse("Exam not found", { status: 404 });

    const classExists = await db.class.findUnique({ where: { id: body.classId } });
    if (!classExists) return new NextResponse("Class not found", { status: 404 });

    const subjectExists = await db.subject.findUnique({ where: { id: body.subjectId } });
    if (!subjectExists) return new NextResponse("Subject not found", { status: 404 });

    // Create the exam date sheet
    const newTimeTable = await db.examDateSheet.create({
      data: {
        examId: body.examId,
        classId: body.classId,
        subjectId: body.subjectId,
        examDate: new Date(body.examDate),
        startTime: new Date(body.startTime),
        endTime: new Date(body.endTime),
        room: body.room ?? null, // optional
      },
    });

    return NextResponse.json({ success: true, data: newTimeTable }, { status: 201 });
  } catch (error) {
    console.error("POST /api/timetable failed:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}


export async function GET(req:NextRequest){
    try {
        const session = await getServerSession(authOption);
        const dateSheet = await db.examDateSheet.findMany()
        return NextResponse.json({_success:true,dateSheet},{status:200})
    } catch (error) {
        console.error("GET /api/timetable failed:",error);
        return new NextResponse("Internal Server Error", {status:500})
    }
}