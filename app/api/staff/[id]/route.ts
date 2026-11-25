import { NextRequest, NextResponse } from "next/server";
import { deleteUserCascade } from "@/lib/db/cascade";
import { requireRole } from "@/app/lib/apiAuth";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";
import type { Gender } from "@/lib/enums";

interface StaffPatchBody {
  name?: string;
  email?: string;
  adharNo?: string;
  designation?: string;
  department?: string;
  salary?: number;
  qualification?: string;
  experience?: string;
  gender?: string;
  phone?: string;
  active?: boolean;
  joinDate?: string;
}

// GET staff by ID
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole("ADMIN");
  if (!auth.ok) return auth.response;
  const { id } = await params;

  const item = await db.staff.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!item) return new NextResponse("Not found", { status: 404 });

  return NextResponse.json(item);
}

// PATCH staff by ID
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as StaffPatchBody | null;
  if (!body) return new NextResponse("Invalid payload", { status: 400 });

  const updated = await db.staff.update({
    where: { id },
    data: {
      designation: body.designation,
      department: body.department,
      salary: body.salary,
      qualification: body.qualification,
      experience: body.experience,
      gender: body.gender as Gender,
      phone: body.phone,
      active: body.active,
      joinDate: body.joinDate ? new Date(body.joinDate) : undefined,
    },
  });

  if (body.name || body.email || body.adharNo || body.active !== undefined) {
    await db.user.update({
      where: { id: updated.userId },
      data: {
        name: body.name,
        email: body.email ? body.email.toLowerCase() : undefined,
        adharNo: body.adharNo,
        isActive: body.active,
      },
    });
  }

  return NextResponse.json(updated);
}

// DELETE staff by ID
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "ADMIN") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const staff = await db.staff.findUnique({ where: { id }, select: { userId: true } });
  if (!staff) return new NextResponse("Not found", { status: 404 });
  if (staff.userId === session.user.id) {
    return new NextResponse("You cannot delete your own account", { status: 400 });
  }

  // Delete the login too: a STAFF user without a staff profile could still sign
  // in but every staff page would fail. Cascades documents, attendance, leaves.
  await deleteUserCascade(staff.userId);

  return new NextResponse(null, { status: 204 });
}
