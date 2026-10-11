import { db } from "@/lib/db";

interface AuditPayload {
  userId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
}

export async function createAuditLog(payload: AuditPayload) {
  try {
    await db.auditLog.create({
      data: {
        userId: payload.userId ?? null,
        action: payload.action,
        entity: payload.entity,
        entityId: payload.entityId ?? null,
        oldValue: payload.oldValue ?? undefined,
        newValue: payload.newValue ?? undefined,
        ipAddress: payload.ipAddress ?? null,
      },
    });
  } catch (error) {
    console.error("Failed to create audit log:", error);
  }
}
