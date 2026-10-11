import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";
import { getSupabaseClient } from "@/app/lib/supabaseClient";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await params;
  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const docs = await db.studentDocument.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: docs });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: studentId } = await params;
  const session = await getServerSession(authOption);
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "Invalid form" }, { status: 400 });

  const file = form.get("file") as File | null;
  const type = form.get("type") as string | null;
  const title = form.get("title") as string | null;

  if (!file || !type || !title) {
    return NextResponse.json({ error: "file, type, title required" }, { status: 400 });
  }

  if (file.size > 2 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large. Max 2MB." }, { status: 400 });
  }

  const ext = file.name.split(".").pop() || "pdf";
  const fileName = `students/${studentId}/documents/${Date.now()}-${title}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await getSupabaseClient().storage
    .from("rgd-school")
    .upload(fileName, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  const { data: publicUrl } = getSupabaseClient().storage
    .from("rgd-school")
    .getPublicUrl(fileName);

  const doc = await db.studentDocument.create({
    data: {
      studentId,
      type,
      title,
      fileUrl: publicUrl.publicUrl,
    },
  });

  return NextResponse.json({ data: doc }, { status: 201 });
}
