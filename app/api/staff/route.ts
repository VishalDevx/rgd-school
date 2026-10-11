import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

import { getServerSession } from "next-auth/next";
import { logger } from "@/app/lib/logger";
import { authOption } from "@/app/lib/auth";

const log = logger("staff-route");

// -------------------------------------------------------
// GET /staff
// -------------------------------------------------------
export async function GET(req: NextRequest) {
  log.info("GET /staff called");

  try {
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

    const staff = await db.staff.findMany({
      where,
      include: { user: true },
      orderBy: { joinDate: "desc" },
    });

    return NextResponse.json({ success: true, data: staff });
  } catch (err) {
    log.error("GET /staff failed", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

// -------------------------------------------------------
// POST /staff  (Admin only)
// -------------------------------------------------------
export async function POST(req: NextRequest) {
  log.info("POST /staff called");

  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) return new NextResponse("Invalid payload", { status: 400 });

    // Validate basics
    if (!body.name || !body.email || !body.designation) {
      return new NextResponse("Missing required fields", { status: 400 });
    }

    const classIds: string[] = Array.isArray(body.classIds)
      ? body.classIds
      : [];

    // NOTE: this used to be db.$transaction. MongoDB Atlas free tier has no
    // replica set, so multi-document transactions are unavailable. We create in
    // order and compensate: if the Staff row fails we delete the User we just
    // made, so a half-created staff account is never left behind.
    let userId: string | null = null;
    let result;
    try {
      // ---- Create user ----
      const user = await db.user.create({
        data: {
          name: String(body.name),
          email: String(body.email).toLowerCase(),
          role: "STAFF",
          adharNo: String(body.adharNo ?? `STAFF-${Date.now()}`),
          passwordHash: String(body.passwordHash),
        },
      });
      userId = user.id;

      // ---- Create staff ----
      const staff = await db.staff.create({
        data: {
          userId: user.id,
          designation: String(body.designation),
          salary: body.salary ? Number(body.salary) : null,
          joinDate: body.joinDate ? new Date(body.joinDate) : new Date(),
        },
      });

      // ---- Assign teacher to multiple classes ----
      // Runs last and is non-critical: a failure here leaves the staff record
      // intact and simply drops the class assignments.
      if (classIds.length > 0) {
        await db.class.updateMany({
          where: { id: { in: classIds } },
          data: { teacherId: staff.id },
        });
      }

      result = { user, staff };
    } catch (err) {
      log.error("POST /staff failed, rolling back user", err);
      if (userId) {
        await db.staff.deleteMany({ userId }).catch(() => undefined);
        await db.user.delete({ where: { id: userId } }).catch(() => undefined);
      }
      throw err;
    }

    return NextResponse.json({ success: true, data: result }, { status: 201 });
  } catch (err) {
    log.error("POST /staff failed", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
