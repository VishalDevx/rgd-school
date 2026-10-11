import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { AnnouncementPayloadSchema } from "@/app/lib/schemas/annoucement.schema.";
import type { Role } from "@/lib/enums";
import { authOption } from "@/app/lib/auth";
import { logger } from "@/app/lib/logger";

const log = logger("announcements-route");

// GET all announcements
export async function GET(_request: NextRequest) {
  const items = await db.announcement.findMany({
    include: { visibleRoles: true, creator: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(items);
}

// POST new announcement (ADMIN/STAFF only)
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOption);

  if (!session?.user || !["ADMIN", "STAFF"].includes(session.user.role)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const parsed = AnnouncementPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { errors: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  const { title, content, roles } = parsed.data;

  // enforce type safety
  const safeRoles: Role[] = roles as Role[];

  // NOTE: this used to be wrapped in db.$transaction. MongoDB Atlas free tier
  // has no replica set, so multi-document transactions are unavailable. We
  // create in order and compensate by deleting the announcement (and its
  // visibility rows) if a later step fails. Notification rows are left alone:
  // they are keyed by title, so deleting them could remove unrelated ones.
  let created;
  let annId: string | null = null;
  try {
    const ann = await db.announcement.create({
      data: {
        title,
        content,
        createdBy: session.user.id,
      },
    });
    annId = ann.id;

    if (safeRoles.length > 0) {
      await db.announcementVisibility.createMany({
        data: safeRoles.map((role: Role) => ({
          announcementId: ann.id,
          role,
        })),
      });
    }

    // Auto-create Notification records for users matching selected roles
    const targetUsers = await db.user.findMany({
      where: { role: { in: safeRoles }, isActive: true },
      select: { id: true },
    });

    if (targetUsers.length > 0) {
      await db.notification.createMany({
        data: targetUsers.map((u) => ({
          userId: u.id,
          type: "ANNOUNCEMENT",
          title: "New Announcement",
          message: title,
        })),
      });
    }

    created = ann;
  } catch (err) {
    log.error("POST /announcements failed, rolling back", err);
    if (annId) {
      await db.announcementVisibility.deleteMany({ announcementId: annId });
      await db.announcement.delete({ where: { id: annId } }).catch(() => undefined);
    }
    throw err;
  }

  return NextResponse.json(created, { status: 201 });
}
