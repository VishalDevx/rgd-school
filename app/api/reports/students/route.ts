import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") ?? "all";
    const classId = searchParams.get("classId");
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");
    const month = searchParams.get("month");

    const students = await db.student.findMany({
      where: {
        active: true,
        ...(classId && { classId }),
      },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        class: { select: { name: true } },
      },
      orderBy: { admissionDate: "desc" },
    });

    switch (type) {
      case "all":
        return NextResponse.json(students.map((s) => ({
          id: s.id,
          admissionNo: s.admissionNo,
          rollNumber: s.rollNumber,
          name: s.user.name,
          email: s.user.email,
          phone: s.user.phone,
          className: s.class?.name ?? "N/A",
          gender: s.gender,
          dob: s.dob,
          admissionDate: s.admissionDate,
          fatherName: s.fatherName,
          motherName: s.motherName,
          active: s.active,
        })));

      case "class-wise": {
        const grouped = new Map<string, typeof students>();
        for (const s of students) {
          const cn = s.class?.name ?? "Unassigned";
          if (!grouped.has(cn)) grouped.set(cn, []);
          grouped.get(cn)!.push(s);
        }
        return NextResponse.json(
          Array.from(grouped.entries()).map(([className, list]) => ({
            className,
            count: list.length,
            students: list.map((s) => ({
              id: s.id,
              admissionNo: s.admissionNo,
              rollNumber: s.rollNumber,
              name: s.user.name,
              gender: s.gender,
            })),
          }))
        );
      }

      case "gender-wise": {
        const byGender = { MALE: 0, FEMALE: 0, OTHER: 0, UNSPECIFIED: 0 };
        for (const s of students) {
          if (s.gender === "MALE") byGender.MALE++;
          else if (s.gender === "FEMALE") byGender.FEMALE++;
          else if (s.gender === "OTHER") byGender.OTHER++;
          else byGender.UNSPECIFIED++;
        }
        return NextResponse.json({
          labels: ["Male", "Female", "Other", "Unspecified"],
          counts: [byGender.MALE, byGender.FEMALE, byGender.OTHER, byGender.UNSPECIFIED],
        });
      }

      case "new-admissions": {
        let filtered = students;
        if (fromDate || toDate) {
          filtered = students.filter((s) => {
            const ad = s.admissionDate;
            if (fromDate && ad < new Date(fromDate)) return false;
            if (toDate && ad > new Date(toDate)) return false;
            return true;
          });
        }
        return NextResponse.json(filtered.map((s) => ({
          id: s.id,
          admissionNo: s.admissionNo,
          rollNumber: s.rollNumber,
          name: s.user.name,
          className: s.class?.name ?? "N/A",
          admissionDate: s.admissionDate,
        })));
      }

      case "birthdays": {
        const now = month ? new Date(month + "-01") : new Date();
        const targetMonth = now.getMonth();

        const filtered = students.filter((s) => {
          if (!s.dob) return false;
          return s.dob.getMonth() === targetMonth;
        });

        return NextResponse.json(
          filtered
            .sort((a, b) => (a.dob?.getDate() ?? 0) - (b.dob?.getDate() ?? 0))
            .map((s) => ({
              id: s.id,
              admissionNo: s.admissionNo,
              rollNumber: s.rollNumber,
              name: s.user.name,
              className: s.class?.name ?? "N/A",
              dob: s.dob,
            }))
        );
      }

      default:
        return NextResponse.json({ error: "Invalid report type" }, { status: 400 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
