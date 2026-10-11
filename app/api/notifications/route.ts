import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";

export async function GET() {
  const session = await getServerSession(authOption);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const notifications = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return NextResponse.json({
    notifications,
    unreadCount,
    total: notifications.length,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOption);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const notificationId = body.id;

  if (notificationId) {
    await db.notification.updateMany({
      where: { id: notificationId, userId: session.user.id },
      data: { read: true },
    });
  } else {
    await db.notification.updateMany({
      where: { userId: session.user.id, read: false },
      data: { read: true },
    });
  }

  return NextResponse.json({ success: true });
}
