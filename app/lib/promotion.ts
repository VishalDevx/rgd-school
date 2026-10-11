import { db } from "@/lib/db";
import type { Grade } from "@/lib/enums";
import type { ClassRow as Class, JsonInput } from "@/lib/types";

const gradeOrder: string[] = [
  "NURSERY",
  "LKG",
  "UKG",
  "ONE",
  "TWO",
  "THREE",
  "FOUR",
  "FIVE",
  "SIX",
  "SEVEN",
  "EIGHT",
  "NINE",
  "TEN",
];

/**
 * Get next grade in sequence
 */
export function getNextGrade(current: string): Grade | null {
  const idx = gradeOrder.indexOf(current);
  if (idx === -1 || idx === gradeOrder.length - 1) return null;
  return gradeOrder[idx + 1] as Grade;
}

/**
 * Promote all active students from the current AcademicSession into classes
 * created/found in the next AcademicSession.
 */
export async function promoteAllActiveStudents() {
  // Determine current active academic session (fallback to latest if none active)
  const currentSession =
    (await db.academicSession.findFirst({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    })) ??
    (await db.academicSession.findFirst({ orderBy: { createdAt: "desc" } }));

  if (!currentSession) {
    return { promotedCount: 0, createdClasses: 0, message: "No academic session found" };
  }

  // Determine next session name. Prefer YYYY-YYYY pattern.
  const m = /^(\d{4})-(\d{4})$/.exec(currentSession.name.trim());
  const nextName = m
    ? `${Number(m[1]) + 1}-${Number(m[2]) + 1}`
    : `${currentSession.name.trim()}-next`;

  const nextSession =
    (await db.academicSession.findFirst({ where: { name: nextName } })) ??
    (await db.academicSession.create({ data: { name: nextName, isActive: false } }));

  const currentClasses: Class[] = await db.class.findMany({
    where: { academicSessionId: currentSession.id },
    orderBy: [{ grade: "asc" }, { section: "asc" }],
  });

  let createdClasses = 0;
  let promotedCount = 0;
  const moves: Array<{ fromClassId: string; toClassId: string; count: number }> = [];

  for (const cls of currentClasses) {
    const nextGrade = getNextGrade(String(cls.grade));
    if (!nextGrade) continue; // terminal grade (TEN)

    const targetExisting = await db.class.findFirst({
      where: {
        academicSessionId: nextSession.id,
        grade: nextGrade,
        section: cls.section ?? null,
        gradeCode: cls.gradeCode ?? null,
      },
    });

    const targetClass =
      targetExisting ??
      (await db.class.create({
        data: {
          academicSessionId: nextSession.id,
          grade: nextGrade,
          section: cls.section ?? null,
          gradeCode: cls.gradeCode ?? null,
          name: `${nextGrade}${cls.section ? `-${cls.section}` : ""}`,
          teacherId: null,
        },
      }));

    if (!targetExisting) createdClasses += 1;

    const result = await db.student.updateMany({
      where: { active: true, classId: cls.id },
      data: { classId: targetClass.id },
    });

    promotedCount += result.count;
    if (result.count > 0) {
      moves.push({ fromClassId: cls.id, toClassId: targetClass.id, count: result.count });
    }
  }

  await db.auditLog.create({
    data: {
      userId: null,
      action: "PROMOTE_STUDENTS",
      entity: "AcademicSession",
      entityId: nextSession.id,
      newValue: {
        currentSessionId: currentSession.id,
        currentSessionName: currentSession.name,
        nextSessionId: nextSession.id,
        nextSessionName: nextSession.name,
        createdClasses,
        promotedCount,
        moves,
      } as JsonInput,
    },
  });

  return {
    currentSession: currentSession.name,
    nextSession: nextSession.name,
    createdClasses,
    promotedCount,
  };
}
