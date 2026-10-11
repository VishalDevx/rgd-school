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
    const type = searchParams.get("type");
    const studentId = searchParams.get("studentId");
    const staffId = searchParams.get("staffId");

    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (studentId) where.studentId = studentId;
    if (staffId) where.staffId = staffId;

    const certificates = await db.certificate.findMany({
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

    return NextResponse.json({ success: true, data: certificates });
  } catch (error) {
    console.error("GET /api/certificates failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch certificates" },
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
    if (!body || !body.type) {
      return NextResponse.json({ error: "type is required" }, { status: 400 });
    }

    if (!body.studentId && !body.staffId) {
      return NextResponse.json(
        { error: "Either studentId or staffId is required" },
        { status: 400 }
      );
    }

    const year = new Date().getFullYear();
    const random = String(Math.floor(10000 + Math.random() * 90000));
    const certificateNo = `CERT-${year}-${random}`;

    let content: Record<string, string> = {};
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
      content = {
        studentName: studentData.user.name,
        fatherName: studentData.fatherName ?? "",
        motherName: studentData.motherName ?? "",
        class: studentData.class?.name ?? "",
        admissionNo: studentData.admissionNo,
        rollNumber: studentData.rollNumber,
        dob: studentData.dob?.toISOString().split("T")[0] ?? "",
        address: studentData.address ?? "",
        gender: studentData.gender ?? "",
        bloodGroup: studentData.bloodGroup ?? "",
      };
    }

    if (body.staffId) {
      staffData = await db.staff.findUnique({
        where: { id: body.staffId },
        include: { user: { select: { name: true } } },
      });
      if (!staffData) {
        return NextResponse.json({ error: "Staff not found" }, { status: 404 });
      }
      content = {
        staffName: staffData.user.name,
        designation: staffData.designation,
        department: staffData.department ?? "",
        qualification: staffData.qualification ?? "",
        staffId: staffData.staffId ?? "",
        joinDate: staffData.joinDate.toISOString().split("T")[0],
      };
    }

    const certificate = await db.certificate.create({
      data: {
        certificateNo,
        type: body.type,
        studentId: body.studentId ?? null,
        staffId: body.staffId ?? null,
        remarks: body.remarks ?? null,
        content,
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

    return NextResponse.json({ success: true, data: certificate }, { status: 201 });
  } catch (error) {
    console.error("POST /api/certificates failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create certificate" },
      { status: 500 }
    );
  }
}
