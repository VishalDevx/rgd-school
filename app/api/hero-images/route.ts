import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";
import { db } from "@/lib/db";
import { getSupabaseServiceClient } from "@/app/lib/supabaseClient";
import type { JsonInput } from "@/lib/types";

// GET hero images
export async function GET() {
  try {
    const settings = await db.schoolSettings.findFirst();
    const heroImages = (settings?.heroImages as Array<{
      id: string;
      url: string;
      title: string;
      description?: string;
    }>) || [];
    return NextResponse.json({ images: heroImages });
  } catch (err) {
    console.error("Error fetching hero images:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST - Upload hero image
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const title = formData.get("title") as string;
    const description = formData.get("description") as string || "";

    if (!file || !title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate file
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Max 5MB allowed." },
        { status: 400 }
      );
    }

    if (!["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only images allowed." },
        { status: 400 }
      );
    }

    // Upload to Supabase
    const timestamp = Date.now();
    const fileName = `hero/${timestamp}_${file.name}`;
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error: uploadError } = await getSupabaseServiceClient().storage
      .from("rgd-school")
      .upload(fileName, buffer, { contentType: file.type });

    if (uploadError) {
      console.error("Supabase upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload image" },
        { status: 500 }
      );
    }

    // Get public URL
    const { data } = getSupabaseServiceClient().storage.from("rgd-school").getPublicUrl(fileName);
    const imageUrl = data.publicUrl;

    // Add to hero images in settings
    const settings = await db.schoolSettings.findFirst();
    const heroImages = ((settings?.heroImages as Array<{
      id: string;
      url: string;
      title: string;
      description?: string;
    }>) || []);

    const newImage = {
      id: `hero_${timestamp}`,
      url: imageUrl,
      title,
      description,
    };

    heroImages.push(newImage);

    await db.schoolSettings.update({
      where: { id: settings!.id },
      data: { heroImages },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "ADD_HERO_IMAGE",
        entity: "SchoolSettings",
        entityId: settings!.id,
        newValue: { image: newImage } as JsonInput,
      },
    });

    return NextResponse.json({ success: true, image: newImage });
  } catch (err) {
    console.error("Error uploading hero image:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE - Remove hero image
export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const imageId = searchParams.get("id");

    if (!imageId) {
      return NextResponse.json(
        { error: "Image ID required" },
        { status: 400 }
      );
    }

    const settings = await db.schoolSettings.findFirst();
    if (!settings) {
      return NextResponse.json(
        { error: "Settings not found" },
        { status: 404 }
      );
    }

    const heroImages = ((settings.heroImages as Array<{
      id: string;
      url: string;
      title?: string;
      description?: string;
    }>) || []);

    const imageIndex = heroImages.findIndex((img) => img.id === imageId);
    if (imageIndex === -1) {
      return NextResponse.json(
        { error: "Image not found" },
        { status: 404 }
      );
    }

    const removedImage = heroImages[imageIndex];
    heroImages.splice(imageIndex, 1);

    await db.schoolSettings.update({
      where: { id: settings.id },
      data: { heroImages },
    });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "DELETE_HERO_IMAGE",
        entity: "SchoolSettings",
        entityId: settings.id,
        oldValue: { image: removedImage } as JsonInput,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error deleting hero image:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
