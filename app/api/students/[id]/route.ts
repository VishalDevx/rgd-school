import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";
import { getSupabaseServiceClient } from "@/app/lib/supabaseClient";
import type { Gender } from "@prisma/client";
import { createAuditLog } from "@/app/lib/audit";

export const runtime = "nodejs";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await params;

  try {
    // ---------------- AUTH CHECK ----------------
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();

    // ---------------- FIELD PARSERS ----------------
    const getStringField = (key: string): string | undefined => {
      const value = form.get(key);
      return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined;
    };

    const dobRaw = getStringField("dob");
    const genderRaw = getStringField("gender");

    const genderEnum: Gender | undefined =
      genderRaw && ["MALE", "FEMALE", "OTHER"].includes(genderRaw.toUpperCase())
        ? (genderRaw.toUpperCase() as Gender)
        : undefined;

    // ---------------- IMAGE UPLOAD ----------------
    let profileImgUrl: string | undefined;
    const file = form.get("file");
    if (file instanceof File && file.size > 0) {
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `students/${Date.now()}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: uploadError } = await getSupabaseServiceClient().storage
        .from("rgd-school")
        .upload(fileName, buffer, { contentType: file.type });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        return NextResponse.json({ error: "Image upload failed" }, { status: 500 });
      }

      const { data } = getSupabaseServiceClient().storage.from("rgd-school").getPublicUrl(fileName);
      profileImgUrl = data.publicUrl;
    }

    // ---------------- ACTIVE TOGGLE ----------------
    const activeRaw = form.get("active");
    let activeToggle: boolean | undefined;
    if (activeRaw === "true") activeToggle = true;
    else if (activeRaw === "false") activeToggle = false;

    // ---------------- TRANSPORT ----------------
    const usesTransport = form.get("usesTransport") === "yes";

    // ---------------- UPDATE STUDENT ----------------
    const updatedStudent = await db.student.update({
      where: { id: studentId },
      data: {
        admissionNo: getStringField("admissionNo"),
        rollNumber: getStringField("rollNumber"),
        classId: getStringField("classId"),
        dob: dobRaw ? new Date(dobRaw) : undefined,
        gender: genderEnum,
        address: getStringField("address"),
        profileImg: profileImgUrl,
        fatherName: getStringField("fatherName"),
        motherName: getStringField("motherName"),
        occupation: getStringField("occupation"),
        religion: getStringField("religion"),
        caste: getStringField("caste"),
        udiseCode: getStringField("udiseCode"),
        contactNo: getStringField("contactNo"),
        active: activeToggle,
        usesTransport,
      },
    });

    if (activeToggle !== undefined) {
      await db.user.update({
        where: { id: updatedStudent.userId },
        data: { isActive: activeToggle },
      });
    }

    // ---------------- UPDATE TRANSPORT ASSIGNMENT ----------------
    const existingTransport = await db.transportAssignment.findUnique({
      where: { studentId },
    });

    if (usesTransport) {
      if (existingTransport) {
        await db.transportAssignment.update({
          where: { studentId },
          data: { isActive: true },
        });
      } else {
        await db.transportAssignment.create({
          data: { studentId, isActive: true },
        });
      }
    } else if (existingTransport) {
      await db.transportAssignment.update({
        where: { studentId },
        data: { isActive: false },
      });
    }

    // ---------------- UPDATE CONNECTED USER ----------------
    const name = getStringField("name");
    const email = getStringField("email");

    if (name || email) {
      await db.user.update({
        where: { id: updatedStudent.userId },
        data: {
          name,
          email: email ? email.toLowerCase() : undefined,
        },
      });
    }

    await createAuditLog({
      userId: session.user.id,
      action: "UPDATE",
      entity: "STUDENT",
      entityId: studentId,
      newValue: { admissionNo: updatedStudent.admissionNo },
    });

    return NextResponse.json(updatedStudent, { status: 200 });
  } catch (err: unknown) {
    console.error("Error updating student:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await params;

  try {
    // ---------------- AUTH CHECK ----------------
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ---------------- FETCH STUDENT ----------------
    const student = await db.student.findUnique({
      where: { id: studentId },
      include: {
        user: { select: { id: true, name: true, email: true, adharNo: true } },
        class: { select: { id: true, name: true, grade: true, section: true } },
        transport: {
          select: { id: true, routeName: true, stopName: true, busNumber: true, driverName: true, driverPhone: true, feeAmount: true, isActive: true },
        },
        fees: {
          select: {
            id: true,
            amountPaid: true,
            status: true,
            paymentDate: true,
            remainAmount: true,
            feeStructure: {
              select: {
                name: true,
                total: true,
                transportFee: true,
                monthlyFee: true,
                totalMonths: true,
                class: {
                  select: {
                    id: true,
                    name: true,
                    academicSession: {
                      select: { id: true, name: true, isActive: true },
                    },
                  },
                },
              },
            },
          },
        },
        results: {
          select: {
            id: true,
            marks: true,
            maxMarks: true,
            grade: true,
            remarks: true,
            exam: { select: { name: true } },
            subject: { select: { name: true } },
          },
        },
        attendance: {
          select: {
            id: true,
            date: true,
            status: true,
          },
        },
      },
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student not found" },
        { status: 404 }
      );
    }

    // Return FLAT student object, not wrapped in `data:`
    return NextResponse.json(student, { status: 200 });

  } catch (err: unknown) {
    console.error("Error fetching student:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const studentId = (await params).id;

    if (!studentId) {
      return new Response(
        JSON.stringify({ error: "Student ID is required" }),
        { status: 400 }
      );
    }

    // AUTH CHECK (assumes you already have session logic globally)
    // remove this block if handled by middleware
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401 }
      );
    }

    await db.student.delete({
      where: {
        id: studentId,
      },include:{fees:true,results:true,attendance:true}
    });

    return new Response(
      JSON.stringify({ message: "Student permanently deleted" }),
      { status: 200 }
    );
  } catch (err: unknown) {
    // Prisma throws if record does not exist
    if (err && typeof err === "object" && "code" in err && err.code === "P2025") {
      return new Response(
        JSON.stringify({ error: "Student not found" }),
        { status: 404 }
      );
    }

    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500 }
    );
  }
}
