/**
 * Offline sanity check for the metadata the Repository derives from Mongoose
 * schemas: relation names and Prisma-style compound unique keys.
 *
 * These are pure schema reads (no connection required) but every query depends
 * on them being right, so they are verified here rather than in production.
 */
import "dotenv/config";
import mongoose from "mongoose";
import { getRelations, toPopulateSpec } from "../lib/db/relations";
import { Repository } from "../lib/db/repository";

// Importing the barrel registers every Mongoose schema with `mongoose.models`.
import "../lib/db";

let failures = 0;
function eq(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) console.log(`  ok  ${name}`);
  else {
    failures++;
    console.log(`FAIL  ${name}\n      actual:   ${a}\n      expected: ${e}`);
  }
}

console.log("relations");
eq(
  "Student.class -> Class via classId",
  (() => {
    const r = getRelations(mongoose.model("Student"));
    return r.class && [r.class.path, r.class.model, r.class.localField];
  })(),
  ["class", "Class", "classId"]
);
eq(
  "Student.user -> User via userId",
  (() => {
    const r = getRelations(mongoose.model("Student"));
    return [r.user.path, r.user.model, r.user.localField];
  })(),
  ["user", "User", "userId"]
);
eq(
  "Class.teacher -> Staff via teacherId",
  (() => {
    const r = getRelations(mongoose.model("Class"));
    return [r.teacher.path, r.teacher.model, r.teacher.localField];
  })(),
  ["teacher", "Staff", "teacherId"]
);
eq(
  "Announcement.createdBy -> User (field not suffixed Id)",
  (() => {
    const r = getRelations(mongoose.model("Announcement"));
    return [r.createdBy.path, r.createdBy.model, r.createdBy.localField];
  })(),
  ["createdBy", "User", "createdBy"]
);
eq(
  "Attendance.markedBy -> Staff",
  (() => {
    const r = getRelations(mongoose.model("Attendance"));
    return [r.markedBy.path, r.markedBy.model, r.markedBy.localField];
  })(),
  ["markedBy", "Staff", "markedById"]
);
eq(
  "SchoolSettings has no relations",
  Object.keys(getRelations(mongoose.model("SchoolSettings"))),
  []
);

console.log("\ncompound unique keys");
function compounds(modelName: string): string[] {
  // Exercise the Repository's real derivation rather than a reimplementation.
  const repo = new Repository(mongoose.model(modelName), modelName);
  return Object.keys((repo as any).compoundKeyMap()).sort();
}
// Attendance has TWO compound indexes: the unique (studentId, date) and the
// non-unique (classId, date) lookup index.
eq("Attendance compound keys", compounds("Attendance"), ["classId_date", "studentId_date"]);
eq("StaffAttendance compound keys", compounds("StaffAttendance"), ["staffId_date"]);
eq("Result compound keys", compounds("Result"), ["studentId_examId_subjectId"]);
eq("Account compound keys", compounds("Account"), ["provider_providerAccountId"]);
eq("HomeworkSubmission compound keys", compounds("HomeworkSubmission"), [
  "homeworkId_studentId",
]);
eq("ExamDateSheet compound keys", compounds("ExamDateSheet"), ["examId_subjectId_classId"]);

console.log("\ncompound key expansion");
const attRepo = new Repository(mongoose.model("Attendance"), "Attendance");
const expanded = (attRepo as any).expandCompoundKeys({
  studentId_date: { studentId: "s1", date: new Date(0) },
});
eq("studentId_date expands", Object.keys(expanded).sort(), ["date", "studentId"]);

console.log("\npopulate spec");
const rel = getRelations(mongoose.model("Student"));
// `toPopulateSpec` returns an ARRAY: Mongoose rejects an object map for the
// nested `populate` field.
eq("include { user: true }", toPopulateSpec({ user: true }, rel), [
  { path: "user", localField: "userId" },
]);
eq(
  "include { class: { include: { academicSession: true } } }",
  toPopulateSpec({ class: { include: { academicSession: true } } }, rel),
  [
    {
      path: "class",
      localField: "classId",
      populate: [{ path: "academicSession", localField: "academicSessionId" }],
    },
  ]
);
eq("reverse relation Class.students declared", (() => {
  const r = getRelations(mongoose.model("Class"));
  return r.students && [r.students.model, r.students.localField];
})(), ["Student", "classId"]);
eq("reverse relation Class.subjects declared", (() => {
  const r = getRelations(mongoose.model("Class"));
  return r.subjects && [r.subjects.model, r.subjects.localField];
})(), ["Subject", "classId"]);
eq("reverse relation Student.fees declared", (() => {
  const r = getRelations(mongoose.model("Student"));
  return r.fees && [r.fees.model, r.fees.localField];
})(), ["FeePayment", "studentId"]);
eq("_count is not a populate", toPopulateSpec({ _count: { select: { a: true } } }, rel), undefined);
eq("unknown key ignored", toPopulateSpec({ nope: true }, rel), undefined);

console.log("\nduplicate index definitions");
{
  const seen: Record<string, string[]> = {};
  for (const name of mongoose.modelNames()) {
    for (const spec of mongoose.model(name).schema.indexes()) {
      const fields = Array.isArray(spec[0])
        ? (spec[0] as unknown[]).map((f) => String(f))
        : Object.keys(spec[0] as Record<string, unknown>);
      const key = `${name}::${fields.join(",")}::unique=${!!spec[1]?.unique}::sparse=${!!spec[1]?.sparse}`;
      (seen[key] ??= []).push(name);
    }
  }
  const dupes = Object.keys(seen).filter((k) => seen[k].length > 1);
  if (dupes.length === 0) console.log("  ok  no duplicate index definitions");
  else {
    failures++;
    dupes.forEach((d) => console.log(`FAIL  duplicate: ${d}`));
  }
}

console.log(`\n${failures === 0 ? "All checks passed." : failures + " FAILURES"}`);
if (failures > 0) process.exitCode = 1;