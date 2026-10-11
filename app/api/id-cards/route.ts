import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOption } from "@/app/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const studentId = searchParams.get("studentId");
    const staffId = searchParams.get("staffId");

    const where: Record<string, unknown> = {};
    if (studentId) where.studentId = studentId;
    if (staffId) where.staffId = staffId;

    const idCards = await db.idCard.findMany({
      where,
      include: {
        student: {
          include: {
            user: { select: { name: true } },
            class: { select: { name: true } },
          },
        },
        staff: {
          include: {
            user: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: idCards });
  } catch (error) {
    console.error("GET /api/id-cards failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch ID cards" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
    }

    if (!body.studentId && !body.staffId) {
      return NextResponse.json(
        { error: "Either studentId or staffId is required" },
        { status: 400 }
      );
    }

    const year = new Date().getFullYear();
    const random = String(Math.floor(10000 + Math.random() * 90000));
    const cardNo = `ID-${year}-${random}`;

    let studentData = null;
    let staffData = null;

    if (body.studentId) {
      studentData = await db.student.findUnique({
        where: { id: body.studentId },
        include: {
          user: { select: { name: true } },
          class: { select: { name: true } },
        },
      });
      if (!studentData) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
      }

      const existing = await db.idCard.findUnique({
        where: { studentId: body.studentId },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Student already has an ID card" },
          { status: 409 }
        );
      }
    }

    if (body.staffId) {
      staffData = await db.staff.findUnique({
        where: { id: body.staffId },
        include: { user: { select: { name: true } } },
      });
      if (!staffData) {
        return NextResponse.json({ error: "Staff not found" }, { status: 404 });
      }

      const existing = await db.idCard.findUnique({
        where: { staffId: body.staffId },
      });
      if (existing) {
        return NextResponse.json(
          { error: "Staff already has an ID card" },
          { status: 409 }
        );
      }
    }

    const idCard = await db.idCard.create({
      data: {
        cardNo,
        studentId: body.studentId ?? null,
        staffId: body.staffId ?? null,
        expiryDate: body.expiryDate ? new Date(body.expiryDate) : null,
      },
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

    return NextResponse.json({ success: true, data: idCard }, { status: 201 });
  } catch (error) {
    console.error("POST /api/id-cards failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create ID card" },
      { status: 500 }
    );
  }
}
