/**
 * Live verification against the real MongoDB cluster.
 * Exercises the repository layer end to end: relations, _count, compound-key
 * upserts, aggregates, sparse/partial unique indexes and relation filters.
 */
import "dotenv/config";
import { connectDB } from "@/lib/mongodb";
import { db } from "@/lib/db";
import { seed } from "./seedData";
import mongoose from "mongoose";

let failures = 0;
function ok(name: string, cond: boolean, detail = "") {
  if (cond) console.log(`  ok  ${name}${detail ? `  ${detail}` : ""}`);
  else {
    failures++;
    console.log(`FAIL  ${name}${detail ? `  ${detail}` : ""}`);
  }
}

async function main() {
  // Run against a throwaway database. These checks create deliberate fixture
  // rows (duplicate keys, orphan-ish records) and must never touch real data.
  const base = process.env.MONGODB_URI!;
  process.env.MONGODB_URI = base.replace(/\/[^/?]*(\?|$)/, "/rgd_school_livetest$1");

  await connectDB();
  console.log(`connected: db=${mongoose.connection.name} host=${mongoose.connection.host}`);

  // Build the fixture data this suite asserts against.
  await seed();

  console.log("\nseeded data");
  ok("users", (await db.user.count()) === 3, `count=${await db.user.count()}`);
  ok("classes", (await db.class.count()) === 1);
  ok("students", (await db.student.count()) === 1);
  ok("subjects", (await db.subject.count()) === 2);
  ok("results", (await db.result.count()) === 2);
  ok("feePayments", (await db.feePayment.count()) === 1);
  ok("examDateSheets", (await db.examDateSheet.count()) === 2);

  console.log("\nid mapping (_id -> id)");
  const student = await db.student.findFirst();
  ok("student.id is a string", typeof student.id === "string", `id=${student.id}`);
  ok("_id is not leaked", !("_id" in student));

  console.log("\nrelations (include)");
  const s = await db.student.findFirst({
    include: { user: true, class: { include: { academicSession: true } } },
  });
  ok("student.user populated", !!s.user && !!s.user.name, `name=${s.user?.name}`);
  ok("nested class.academicSession populated", !!s.class?.academicSession?.name, `session=${s.class?.academicSession?.name}`);
  ok("populated subdoc uses id", !!s.class?.id && typeof s.class.id === "string");

  console.log("\nselect projection");
  const projected = await db.student.findFirst({
    select: { admissionNo: true, class: { select: { name: true } } },
  });
  ok("only requested scalars", projected.admissionNo === "ADM-0001" && !("religion" in projected), JSON.stringify(Object.keys(projected)));
  ok("relation still populated", !!projected.class?.name, `class=${projected.class?.name}`);

  console.log("\nwhere operators");
  ok("in", (await db.result.findMany({ where: { subjectId: { in: [] } } })).length === 0);
  ok("gt on number", (await db.expense.findMany({ where: { amount: { gt: 100 } } })).length === 1);
  ok("OR", (await db.user.findMany({ where: { OR: [{ role: "ADMIN" }, { role: "STAFF" }] } })).length === 2);
  ok("string contains", (await db.user.findMany({ where: { email: { contains: "school.com" } } })).length === 3);

  console.log("\norderBy + take/skip");
  const byRoll = await db.student.findMany({ orderBy: { admissionNo: "desc" }, take: 5 });
  ok("orderBy works", byRoll.length === 1);
  ok("count()", (await db.user.count({ where: { role: "ADMIN" } })) === 1);

  console.log("\naggregate (_sum)");
  const agg = await db.feePayment.aggregate({ _sum: { remainAmount: true } });
  ok("_sum returns Prisma shape", agg?._sum?.remainAmount === 5400, JSON.stringify(agg));
  const agg2 = await db.expense.aggregate({ _sum: { amount: true }, where: { amount: { gt: 0 } } });
  ok("_sum with where", agg2?._sum?.amount === 8500, JSON.stringify(agg2));

  console.log("\ncompound-key upsert (studentId_date)");
  const st = await db.student.findFirst();
  const staff = await db.staff.findFirst();
  const day = new Date("2026-01-15T00:00:00.000Z");
  const att1 = await db.attendance.upsert({
    where: { studentId_date: { studentId: st.id, date: day } },
    update: { status: "ABSENT" },
    create: { classId: st.classId, studentId: st.id, date: day, status: "PRESENT", markedById: staff.id },
  });
  ok("upsert created", !!att1.id);
  const att2 = await db.attendance.upsert({
    where: { studentId_date: { studentId: st.id, date: day } },
    update: { status: "ABSENT" },
    create: { classId: st.classId, studentId: st.id, date: day, status: "PRESENT", markedById: staff.id },
  });
  ok("upsert updated same row (no duplicate)", att1.id === att2.id, `${att1.id} vs ${att2.id}`);
  ok("update applied", att2.status === "ABSENT", `status=${att2.status}`);
  ok("no duplicate attendance rows", (await db.attendance.count({ where: { studentId: st.id, date: day } })) === 1);
  await db.attendance.deleteMany({ where: { studentId: st.id, date: day } });

  console.log("\nrelation filter (where: { exam: { classId } })");
  const cls = await db.class.findFirst();
  const filtered = await db.result.findMany({ where: { exam: { classId: cls.id } } });
  ok("relation filter narrows correctly", filtered.length === 2, `rows=${filtered.length}`);
  const none = await db.result.findMany({ where: { exam: { classId: new mongoose.Types.ObjectId().toString() } } });
  ok("relation filter with no match returns 0", none.length === 0, `rows=${none.length}`);

  console.log("\n_count");
  const withCount = await db.class.findMany({ select: { name: true, _count: { select: { students: true, subjects: true } } } });
  ok("_count.students", withCount[0]._count.students === 1, JSON.stringify(withCount[0]._count));
  ok("_count.subjects", withCount[0]._count.subjects === 2, JSON.stringify(withCount[0]._count));

  console.log("\nsparse unique indexes (the MongoDB null-collision trap)");
  let extraSeq = 0;
  const mkStudent = async (adm: string, roll: string) => {
    extraSeq += 1;
    const u = await db.user.create({
      data: {
        name: `Extra ${adm}`,
        email: `${adm.toLowerCase()}@school.com`,
        adharNo: `8${String(extraSeq).padStart(10, "0")}${extraSeq % 10}`,
        role: "STUDENT",
      },
    });
    return db.student.create({ data: { userId: u.id, admissionNo: adm, rollNumber: roll } });
  };
  const sid1 = st.id;
  const sid2 = (await mkStudent("ADM-SP1", "02")).id;
  const sid3 = (await mkStudent("ADM-SP2", "03")).id;
  try {
    await db.idCard.create({ data: { studentId: sid1, cardNo: "C-1" } });
    await db.idCard.create({ data: { studentId: sid2, cardNo: "C-2" } });
    await db.idCard.create({ data: { staffId: staff.id, cardNo: "C-3" } });
    ok("multiple ID cards with null staffId", true, "(no null collision)");
  } catch (e: any) {
    ok("multiple ID cards with null staffId", false, e.message?.slice(0, 80));
  }
  try {
    await db.feePayment.create({ data: { studentId: sid2, feeStructureId: (await db.feeStructure.findFirst()).id, amountPaid: 0, remainAmount: 0 } });
    await db.feePayment.create({ data: { studentId: sid3, feeStructureId: (await db.feeStructure.findFirst()).id, amountPaid: 0, remainAmount: 0 } });
    ok("multiple fee payments with null razorpayOrder", true, "(no null collision)");
  } catch (e: any) {
    ok("multiple fee payments with null razorpayOrder", false, e.message?.slice(0, 80));
  }

  console.log("\npartial unique index: Student(classId, rollNumber)");
  try {
    await mkStudent("ADM-D1", "01");
    await mkStudent("ADM-D2", "01");
    ok("unassigned students can share rollNumber", true, "(no null collision on classId)");
  } catch (e: any) {
    ok("unassigned students can share rollNumber", false, e.message?.slice(0, 90));
  }
  try {
    const u = await db.user.create({
      data: { name: "Dup A", email: "dup-a@school.com", adharNo: "500000000001", role: "STUDENT" },
    });
    const u2 = await db.user.create({
      data: { name: "Dup B", email: "dup-b@school.com", adharNo: "500000000002", role: "STUDENT" },
    });
    await db.student.create({ data: { userId: u.id, admissionNo: "ADM-C1", rollNumber: "77", classId: cls.id } });
    await db.student.create({ data: { userId: u2.id, admissionNo: "ADM-C2", rollNumber: "77", classId: cls.id } });
    ok("same class + rollNumber IS rejected", false, "duplicate was accepted");
  } catch (e: any) {
    ok("same class + rollNumber IS rejected", true, `code=${e.code}`);
  }

  console.log("\nenums / dates / money round-trip");
  const u = await db.user.findUnique({ where: { email: "admin@school.com" } });
  ok("role persisted as string", u.role === "ADMIN", `role=${u.role}`);
  ok("dates come back as Date", u.createdAt instanceof Date, `createdAt=${u.createdAt?.constructor?.name}`);
  const fp = await db.feePayment.findFirst();
  ok("money is a number", typeof fp.amountPaid === "number", `amountPaid=${fp.amountPaid} (${typeof fp.amountPaid})`);

  console.log(`\n${failures === 0 ? "ALL LIVE CHECKS PASSED" : failures + " FAILURES"}`);

  // Leave nothing behind in the throwaway database.
  await mongoose.connection.db!.dropDatabase();
  console.log(`dropped test database: ${mongoose.connection.name}`);

  if (failures > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });