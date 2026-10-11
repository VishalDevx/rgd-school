import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getServerSession } from "next-auth/next";
import { authOption } from "@/app/lib/auth";
import { logger } from "./logger";

const log = logger("cron");

export interface CronJobConfig {
  name: string;
  description: string;
  schedule: string;
  handler: () => Promise<CronResult>;
}

export interface CronResult {
  success: boolean;
  message: string;
  stats?: Record<string, number>;
  durationMs: number;
}

export async function authorizeCron(req: NextRequest): Promise<boolean> {
  const session = await getServerSession(authOption);
  const headerToken = req.headers.get("x-cron-token");
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice("Bearer ".length) : authHeader;
  const envToken = process.env.CRON_SECRET_TOKEN ?? process.env.CRON_SECRET;

  return !!(
    session?.user?.role === "ADMIN" ||
    (envToken && headerToken === envToken) ||
    (envToken && bearer === envToken)
  );
}

export async function executeCronJob(
  name: string,
  handler: () => Promise<CronResult>
): Promise<NextResponse> {
  const start = Date.now();
  const startLog = await db.auditLog.create({
    data: {
      action: "CRON_START",
      entity: "CRON_JOB",
      entityId: name,
      newValue: { startedAt: new Date().toISOString() },
    },
  });

  try {
    const result = await handler();
    const durationMs = Date.now() - start;

    await db.auditLog.create({
      data: {
        action: result.success ? "CRON_COMPLETE" : "CRON_FAILED",
        entity: "CRON_JOB",
        entityId: name,
        oldValue: { auditLogId: startLog.id },
        newValue: { ...result, durationMs },
      },
    });

    log.info(`Cron "${name}" completed in ${durationMs}ms`, result);
    return NextResponse.json({ ok: true, ...result, durationMs });
  } catch (error) {
    const durationMs = Date.now() - start;
    const message = error instanceof Error ? error.message : "Unknown error";

    await db.auditLog.create({
      data: {
        action: "CRON_FAILED",
        entity: "CRON_JOB",
        entityId: name,
        oldValue: { auditLogId: startLog.id },
        newValue: { error: message, durationMs },
      },
    });

    log.error(`Cron "${name}" failed after ${durationMs}ms:`, message);
    return NextResponse.json({ ok: false, error: message, durationMs }, { status: 500 });
  }
}

export const CRON_SCHEDULES: Record<string, { description: string; schedule: string }> = {
  "attendance-reminder": {
    description: "Send attendance alerts to students marked ABSENT today",
    schedule: "30 18 * * 1-5",
  },
  "fee-reminder": {
    description: "Send fee reminders to students with due/overdue payments",
    schedule: "0 6 * * *",
  },
  "daily-digest": {
    description: "Send daily summary stats to admin",
    schedule: "0 20 * * *",
  },
  "promote-students": {
    description: "Promote all active students to next grade (end of academic year)",
    schedule: "35 18 31 3 *",
  },
};
