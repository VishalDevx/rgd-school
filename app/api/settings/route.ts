import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";
import { db } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// GET school settings
export async function GET() {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await db.schoolSettings.findFirst();
    
    if (!settings) {
      // Create default settings if none exist
      const defaultSettings = await db.schoolSettings.create({
        data: {
          name: "RGD School",
          tier: "BASIC",
          primaryColor: "#2563eb",
        },
      });
      return NextResponse.json(defaultSettings);
    }

    return NextResponse.json(settings);
  } catch (err) {
    console.error("Error fetching settings:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}

// PUT/PATCH school settings
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOption);
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({})) as {
      name?: string;
      address?: string | null;
      contactEmail?: string | null;
      contactPhone?: string | null;
      academicYear?: string | null;
      logoUrl?: string | null;
      faviconUrl?: string | null;
      primaryColor?: string | null;
      tier?: "BASIC" | "PRO" | "ENTERPRISE";
      featureFlags?: unknown;
      principalName?: string | null;
      registrationNo?: string | null;
      udiseCode?: string | null;
      receiptPrefix?: string | null;
      admissionPrefix?: string | null;
      staffIdPrefix?: string | null;
      gradingSystem?: string | null;
      dateFormat?: string | null;
      currency?: string | null;
      website?: string | null;
      pdfHeader?: string | null;
      pdfFooter?: string | null;
    };
    const {
      name,
      address,
      contactEmail,
      contactPhone,
      academicYear,
      logoUrl,
      faviconUrl,
      primaryColor,
      tier,
      featureFlags,
      principalName,
      registrationNo,
      udiseCode,
      receiptPrefix,
      admissionPrefix,
      staffIdPrefix,
      gradingSystem,
      dateFormat,
      currency,
      website,
      pdfHeader,
      pdfFooter,
    } = body;

    // Get existing settings or create new
    const existing = await db.schoolSettings.findFirst();
    
    const updated = existing
      ? await db.schoolSettings.update({
          where: { id: existing.id },
          data: {
            name: name ?? existing.name,
            address: address !== undefined ? address : existing.address,
            contactEmail: contactEmail !== undefined ? contactEmail : existing.contactEmail,
            contactPhone: contactPhone !== undefined ? contactPhone : existing.contactPhone,
            academicYear: academicYear !== undefined ? academicYear : existing.academicYear,
            logoUrl: logoUrl !== undefined ? logoUrl : existing.logoUrl,
            faviconUrl: faviconUrl !== undefined ? faviconUrl : existing.faviconUrl,
            primaryColor: primaryColor !== undefined ? primaryColor : existing.primaryColor,
            tier: tier ?? existing.tier,
            featureFlags: featureFlags !== undefined 
              ? (featureFlags as Prisma.InputJsonValue) 
              : (existing.featureFlags ?? Prisma.DbNull),
            principalName: principalName !== undefined ? principalName : existing.principalName,
            registrationNo: registrationNo !== undefined ? registrationNo : existing.registrationNo,
            udiseCode: udiseCode !== undefined ? udiseCode : existing.udiseCode,
            receiptPrefix: receiptPrefix !== undefined ? receiptPrefix : existing.receiptPrefix,
            admissionPrefix: admissionPrefix !== undefined ? admissionPrefix : existing.admissionPrefix,
            staffIdPrefix: staffIdPrefix !== undefined ? staffIdPrefix : existing.staffIdPrefix,
            gradingSystem: gradingSystem !== undefined ? gradingSystem : existing.gradingSystem,
            dateFormat: dateFormat !== undefined ? dateFormat : existing.dateFormat,
            currency: currency !== undefined ? currency : existing.currency,
            website: website !== undefined ? website : existing.website,
            pdfHeader: pdfHeader !== undefined ? pdfHeader : existing.pdfHeader,
            pdfFooter: pdfFooter !== undefined ? pdfFooter : existing.pdfFooter,
          },
        })
      : await db.schoolSettings.create({
          data: {
            name: name || "RGD School",
            address,
            contactEmail,
            contactPhone,
            academicYear,
            logoUrl,
            faviconUrl,
            primaryColor: primaryColor || "#2563eb",
            tier: tier || "BASIC",
            featureFlags: featureFlags as Prisma.InputJsonValue | undefined,
            principalName,
            registrationNo,
            udiseCode,
            receiptPrefix,
            admissionPrefix,
            staffIdPrefix,
            gradingSystem,
            dateFormat,
            currency,
            website,
            pdfHeader,
            pdfFooter,
          },
        });

    // Create audit log
    await db.auditLog.create({
      data: {
        userId: session.user.id,
        action: "UPDATE_SETTINGS",
        entity: "SchoolSettings",
        entityId: updated.id,
        oldValue: existing 
          ? (JSON.parse(JSON.stringify(existing)) as Prisma.InputJsonValue)
          : Prisma.DbNull,
        newValue: JSON.parse(JSON.stringify(updated)) as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Error updating settings:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal Server Error" },
      { status: 500 }
    );
  }
}
