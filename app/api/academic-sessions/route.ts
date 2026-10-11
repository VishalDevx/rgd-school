import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";
import { db } from "@/lib/db";

/* ----------------------------- GET ----------------------------- */
/* Fetch all academic sessions */
export async function GET() {
  try {
    const session = await getServerSession(authOption);

    if (!session?.user || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const sessions = await db.academicSession.findMany({
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ data: sessions });
  } catch (error) {
    console.error("GET AcademicSession error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

/* ----------------------------- POST ----------------------------- */
/* Create new academic session */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);

    if (!session?.user || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return new NextResponse("Invalid JSON", { status: 400 });
    }

    const { name, isActive } = body;

    if (!name || typeof name !== "string") {
      return new NextResponse("Session name is required", { status: 400 });
    }

    // If new session is active → deactivate old ones
    if (isActive === true) {
      await db.academicSession.updateMany({
        where: { isActive: true },
        data: { isActive: false },
      });
    }

    const academicSession = await db.academicSession.create({
      data: {
        name,
        isActive: Boolean(isActive),
      },
    });

    return NextResponse.json(
      { message: "Academic session created", data: academicSession },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST AcademicSession error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
