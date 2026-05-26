import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";
import { getSupabaseClient } from "@/app/lib/supabaseClient";
import { createAuditLog } from "@/app/lib/audit";

export const dynamic = "force-dynamic";

type Gender = "MALE" | "FEMALE" | "OTHER" | null;

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await req.formData();

    const name = form.get("name") as string | null;
    const email = form.get("email") as string | null;
    const adharNo = form.get("adharNo") as string | null;
    const admissionNo = form.get("admissionNo") as string | null;
    const rollNumber = form.get("rollNumber") as string | null;

    const dob = form.get("dob") as string | null;
    const gender = form.get("gender") as string | null;
    const address = form.get("address") as string | null;
    const classId = form.get("classId") as string | null;
    const passwordHash = form.get("passwordHash") as string | null;

    const fatherName = form.get("fatherName") as string | null;
    const motherName = form.get("motherName") as string | null;
    const occupation = form.get("occupation") as string | null;
    const religion = form.get("religion") as string | null;
    const caste = form.get("caste") as string | null;
    const udiseCode = form.get("udiseCode") as string | null;
    const panNo = form.get("panNo") as string | null;
    const apaarId = form.get("apaarId") as string | null;
    const fatherAadhar = form.get("fatherAadhar") as string | null;
    const motherAadhar = form.get("motherAadhar") as string | null;
    const contactNo = form.get("contactNo") as string | null;
    const usesTransport = form.get("usesTransport") === "yes";

    const file = form.get("file") as File | null;

    // Validate required fields
    const required = { name, email, adharNo, admissionNo, rollNumber };
    for (const [key, value] of Object.entries(required)) {
      if (!value) {
        return NextResponse.json({ error: `Missing ${key}` }, { status: 400 });
      }
    }

    let profileImgUrl = "";
    if (file) {
      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const ext = file.name.split(".").pop();
      const fileName = `students/${Date.now()}-${name}.${ext}`;

      const { error: uploadError } = await getSupabaseClient().storage
        .from("rgd-school")
        .upload(fileName, buffer, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

      if (uploadError) {
        return NextResponse.json(
          { error: "Image upload failed" },
          { status: 500 }
        );
      }

      const { data } = getSupabaseClient().storage
        .from("rgd-school")
        .getPublicUrl(fileName);

      profileImgUrl = data.publicUrl;
    }

    // Transaction
    const created = await db.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: name!,
          email: email!.toLowerCase(),
          adharNo: adharNo!,
          role: "STUDENT",
          passwordHash,
        },
      });

      const parsedGender: Gender =
        gender && ["MALE", "FEMALE", "OTHER"].includes(gender.toUpperCase())
          ? (gender.toUpperCase() as Gender)
          : null;

      const student = await tx.student.create({
        data: {
          userId: user.id,
          admissionNo: admissionNo!,
          rollNumber: rollNumber!,
          classId: classId || null,
          dob: dob ? new Date(dob) : null,
          gender: parsedGender,
          address,
          profileImg: profileImgUrl,
          fatherName,
          motherName,
          occupation: occupation ?? undefined,
          religion: religion ?? undefined,
          caste: caste ?? undefined,
          udiseCode,
          panNo,
          apaarId,
          fatherAadhar,
          motherAadhar,
          contactNo,
          usesTransport,
        },
      });

      if (usesTransport) {
        await tx.transportAssignment.create({
          data: {
            studentId: student.id,
            isActive: true,
          },
        });
      }

      return { user, student };
    });

    await createAuditLog({
      userId: session.user.id,
      action: "CREATE",
      entity: "STUDENT",
      entityId: created.student.id,
      newValue: { admissionNo: created.student.admissionNo, name: created.user.name },
    });

    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const activeFilter = searchParams.get("active");

    const where: Record<string, unknown> = {};
    if (activeFilter === "all") {
      // show all
    } else if (activeFilter === "false") {
      where.active = false;
    } else {
      where.active = true; // default: active only
    }

    const students = await db.student.findMany({
      where,
      orderBy: { admissionDate: "desc" },
      include: {
        user: true,
        class: true,
      },
    });

    const data = students.map((s: typeof students[number]) => ({
      id: s.id,
      admissionNo: s.admissionNo,
      rollNumber: s.rollNumber,
      admissionDate: s.admissionDate,
      dob: s.dob,
      gender: s.gender,
      address: s.address,
      profileImg: s.profileImg,
      class: s.class,
      user: s.user,
      active: s.active,
      usesTransport: s.usesTransport,
    }));

    return NextResponse.json(data, { status: 200 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
