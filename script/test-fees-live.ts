/**
 * End-to-end checks of the fee service against a REAL MongoDB.
 *
 * DESTRUCTIVE: wipes the database it connects to, so it refuses anything but
 * localhost. Spin one up with:
 *   docker run -d --rm --name rgd-mongo -p 27099:27017 mongo:7
 *   MONGODB_URI=mongodb://localhost:27099/rgd_fee_test npm run test:fees:live
 */

import mongoose from "mongoose";
import { db } from "@/lib/db";
import "@/models/Finance";
import { deleteUserCascade, DeleteBlockedError } from "@/lib/db/cascade";
import {
  FeeError,
  createStructure,
  deleteStructure,
  getFeeOverview,
  getReceipt,
  getStudentStatement,
  listDues,
  listTransactions,
  recalculateAll,
  recordPayment,
  searchStudents,
  syncStudent,
  updateStructure,
  voidTransaction,
} from "@/lib/fees/service";
import { paymentInput, type PaymentInput } from "@/lib/fees/validation";

const uri = process.env.MONGODB_URI ?? "";
if (!/^mongodb:\/\/(localhost|127\.0\.0\.1)[:/]/.test(uri)) {
  console.error("Refusing to run: MONGODB_URI must point at localhost (this test wipes the database).");
  process.exit(1);
}

let failed = 0;
let passed = 0;
function ok(name: string, cond: boolean, detail?: unknown) {
  if (cond) {
    passed++;
    console.log(`  ok  ${name}`);
  } else {
    failed++;
    console.log(`FAIL  ${name}${detail !== undefined ? `  -> ${JSON.stringify(detail)}` : ""}`);
  }
}
async function rejects(name: string, fn: () => Promise<unknown>, status?: number) {
  try {
    await fn();
    ok(name, false, "did not throw");
  } catch (e) {
    const s = (e as { status?: number }).status;
    ok(name, status === undefined || s === status, { status: s, message: (e as Error).message });
  }
}
// Untyped handles avoid the union type of the `models.X || model()` exports.
const FeePayment = mongoose.model("FeePayment");
const FeeTransaction = mongoose.model("FeeTransaction");
const pay = (p: Record<string, unknown>): PaymentInput => paymentInput.parse(p);

async function mkStudent(name: string, adm: string, classId: string, usesTransport: boolean, active = true) {
  const user = await db.user.create({
    data: { name, email: `${adm.toLowerCase()}@t.test`, adharNo: `AADHAR-${adm}`, role: "STUDENT", passwordHash: "hash-" + adm },
  });
  return db.student.create({ data: { userId: user.id, admissionNo: adm, rollNumber: adm.slice(-2), classId, usesTransport, active } });
}

async function main() {
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  await db.syncIndexes();

  const admin = await db.user.create({
    data: { name: "Admin", email: "admin@t.test", adharNo: "AADHAR-ADMIN", role: "ADMIN", passwordHash: "secret-hash" },
  });
  await db.schoolSettings.create({ data: { name: "Test School", receiptPrefix: "TS" } });
  const sess = await db.academicSession.create({ data: { name: "2026-2027", isActive: true } });
  const c1 = await db.class.create({ data: { name: "FIVE-A", grade: "FIVE", section: "A", academicSessionId: sess.id } });
  const c2 = await db.class.create({ data: { name: "SIX-A", grade: "SIX", section: "A", academicSessionId: sess.id } });

  const A = await mkStudent("Asha Rao", "ADM001", c1.id, true);
  const B = await mkStudent("Bilal Khan", "ADM002", c1.id, false);
  await mkStudent("Chitra Inactive", "ADM003", c1.id, false, false);

  console.log("\npassword hash is hidden by default");
  const plain = await db.user.findUnique({ where: { id: admin.id } });
  ok("findUnique omits passwordHash", plain && !("passwordHash" in plain), plain);
  const withHash = await db.user.findUnique({ where: { id: admin.id }, select: { id: true, passwordHash: true } });
  ok("explicit select returns passwordHash", withHash?.passwordHash === "secret-hash");
  const populated = await db.student.findUnique({ where: { id: A.id }, include: { user: true } });
  ok("populated user omits passwordHash", populated?.user && !("passwordHash" in populated.user));

  console.log("\nstructure billing");
  const s1 = await createStructure({ classId: c1.id, name: "Annual 26-27", monthlyFee: 500, totalMonths: 12, examFee: 1000, transportFee: 2400 });
  ok("bills only active students", s1.studentsBilled === 2, s1);
  type Acc = { totalDue: number; remainAmount: number; status: string; amountPaid: number } | null;
  let accA = (await FeePayment.findOne({ studentId: A.id }).lean()) as unknown as Acc;
  let accB = (await FeePayment.findOne({ studentId: B.id }).lean()) as unknown as Acc;
  ok("transport student owes tuition+exam+transport", accA?.totalDue === 6000 + 1000 + 2400, accA);
  ok("non-transport student owes tuition+exam", accB?.totalDue === 7000, accB);
  ok("new accounts start pending", accA?.status === "PENDING");

  console.log("\ncollecting");
  const r1 = await recordPayment(pay({ studentId: A.id, feeStructureId: s1.id, amount: 3000, paymentMode: "UPI", referenceNo: "UTR1" }), admin.id);
  ok("receipt number uses school prefix", /^TS\d{6}$/.test(r1.receiptNo), r1.receiptNo);
  ok("partial balance", r1.balance.remainAmount === 6400 && r1.balance.status === "PARTIAL", r1.balance);
  const r2 = await recordPayment(pay({ studentId: A.id, feeStructureId: s1.id, amount: 1000 }), admin.id);
  ok("receipt numbers are unique and increasing", r2.receiptNo > r1.receiptNo, [r1.receiptNo, r2.receiptNo]);
  await rejects("overpayment is refused", () => recordPayment(pay({ studentId: B.id, feeStructureId: s1.id, amount: 7001 }), admin.id), 400);
  const r3 = await recordPayment(pay({ studentId: B.id, feeStructureId: s1.id, amount: 6000, discount: 500 }), admin.id);
  ok("concession reduces balance without counting as paid", r3.balance.amountPaid === 6000 && r3.balance.remainAmount === 500, r3.balance);
  const r4 = await recordPayment(pay({ studentId: B.id, feeStructureId: s1.id, amount: 550, lateFine: 50 }), admin.id);
  ok("late fine + settlement -> PAID", r4.balance.status === "PAID" && r4.balance.remainAmount === 0, r4.balance);

  console.log("\nreceipts");
  const rc = await getReceipt(r1.id);
  ok("receipt shows balance as of that payment", rc.balanceAfter.remainAmount === 6400, rc.balanceAfter);
  ok("receipt names the collector", rc.receipt.collectedBy === "Admin");

  console.log("\nvoiding");
  const v = await voidTransaction(r1.id, "Wrong student", admin.id);
  ok("void restores the balance", v.balance?.remainAmount === 9400 - 1000, v.balance);
  await rejects("cannot void twice", () => voidTransaction(r1.id, "again", admin.id), 409);
  const list = await listTransactions({});
  ok("voided receipts hidden by default", list.items.every((i) => !i.voided) && list.total === 3, list.total);
  ok("totals exclude voided", list.totals.amount === 1000 + 6000 + 550, list.totals);
  const search = await listTransactions({ q: "bilal" });
  ok("search by student name", search.total === 2, search.total);

  console.log("\nstructure edits re-bill");
  await updateStructure(s1.id, { classId: c1.id, name: "Annual 26-27", monthlyFee: 600, totalMonths: 12, examFee: 1000, transportFee: 2400 });
  accA = (await FeePayment.findOne({ studentId: A.id }).lean()) as unknown as Acc;
  ok("edit recomputes every student's balance", accA?.totalDue === 7200 + 1000 + 2400 && accA?.remainAmount === 10600 - 1000, accA);
  await rejects("class of a paid structure cannot change", () =>
    updateStructure(s1.id, { classId: c2.id, monthlyFee: 600, totalMonths: 12 }), 409);

  console.log("\nstudent changes");
  await db.student.update({ where: { id: B.id }, data: { usesTransport: true } });
  await syncStudent(B.id);
  accB = (await FeePayment.findOne({ studentId: B.id }).lean()) as unknown as Acc;
  ok("starting transport adds the transport fee", accB?.totalDue === 10600 && accB?.remainAmount === 10600 - 500 + 50 - 6550, accB);

  const D = await mkStudent("Dev Late", "ADM004", c1.id, false);
  await syncStudent(D.id);
  ok("student joining later is billed", (await FeePayment.countDocuments({ studentId: D.id })) === 1);
  await db.student.update({ where: { id: D.id }, data: { classId: c2.id } });
  await syncStudent(D.id, { previousClassId: c1.id });
  ok("moving class drops the untouched old account", (await FeePayment.countDocuments({ studentId: D.id })) === 0);

  console.log("\nlegacy migration");
  const legacyStructure = await db.feeStructure.create({ data: { classId: c1.id, name: "Old fee", examFee: 2000, total: 2000 } });
  await FeePayment.collection.insertOne({
    studentId: new mongoose.Types.ObjectId(A.id),
    feeStructureId: new mongoose.Types.ObjectId(legacyStructure.id),
    amountPaid: 1200,
    remainAmount: 800,
    status: "PARTIAL",
    receiptNo: "RCP000001",
    paymentMode: "CASH",
    paymentDate: new Date("2026-04-02"),
  });
  const st = await getStudentStatement(A.id);
  const legacy = st.accounts.find((a) => a.structureId === legacyStructure.id);
  ok("old balance kept as a legacy receipt", legacy?.balance.amountPaid === 1200 && legacy?.receipts[0]?.isLegacy === true, legacy?.balance);
  ok("legacy receipt keeps its old number", legacy?.receipts[0]?.receiptNo === "RCP000001");
  await getStudentStatement(A.id);
  ok("legacy migration is idempotent", (await FeeTransaction.countDocuments({ feeStructureId: legacyStructure.id })) === 1);

  console.log("\nduplicate accounts are merged");
  await FeePayment.collection.dropIndex("studentId_1_feeStructureId_1");
  await FeePayment.collection.insertOne({
    studentId: new mongoose.Types.ObjectId(B.id),
    feeStructureId: new mongoose.Types.ObjectId(legacyStructure.id),
    amountPaid: 300, remainAmount: 1700, status: "PARTIAL", createdAt: new Date(1),
  });
  await FeePayment.collection.insertOne({
    studentId: new mongoose.Types.ObjectId(B.id),
    feeStructureId: new mongoose.Types.ObjectId(legacyStructure.id),
    amountPaid: 200, remainAmount: 1800, status: "PARTIAL", createdAt: new Date(2),
  });
  const rec = await recalculateAll();
  ok("recalculate merges the duplicate", rec.mergedDuplicates === 1, rec);
  const merged = (await FeePayment.find({ studentId: B.id, feeStructureId: legacyStructure.id }).lean()) as unknown as Array<{ amountPaid: number }>;
  ok("merged account keeps both payments", merged.length === 1 && merged[0].amountPaid === 500, merged);
  const idx = await FeePayment.collection.indexes();
  ok("unique account index rebuilt", idx.some((i) => i.name === "studentId_1_feeStructureId_1" && i.unique));

  console.log("\nreporting");
  const dues = await listDues({});
  ok("dues list has both students", dues.items.length === 2, dues.items.map((i) => i.name));
  ok("dues are sorted by amount", dues.items[0].remaining >= dues.items[1].remaining);
  const ov = await getFeeOverview();
  ok("overview collected = live receipts", ov.collected === 1000 + 6000 + 550 + 1200 + 300 + 200, ov.collected);
  ok("overview has a class row", ov.byClass.length === 1 && ov.byClass[0].className === "FIVE-A", ov.byClass);
  const found = await searchStudents("ADM00");
  ok("student search by admission no", found.length >= 3, found.length);

  console.log("\ndeletes");
  await rejects("structure with payments cannot be deleted", () => deleteStructure(s1.id), 409);
  const empty = await createStructure({ classId: c2.id, name: "Unused", examFee: 100 });
  await deleteStructure(empty.id);
  ok("empty structure deletes", !(await db.feeStructure.findFirst({ where: { id: empty.id } })));
  try {
    await deleteUserCascade(A.userId);
    ok("student with receipts cannot be deleted", false);
  } catch (e) {
    ok("student with receipts cannot be deleted", e instanceof DeleteBlockedError);
  }
  await deleteUserCascade(D.userId);
  ok("cascade removes the student row", !(await db.student.findFirst({ where: { id: D.id } })));
  ok("cascade removes the user", !(await db.user.findFirst({ where: { id: D.userId } })));

  ok("FeeError carries an HTTP status", new FeeError("x", 418).status === 418);

  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  console.log(failed ? `\n${failed} live fee check(s) FAILED (${passed} passed).` : `\nAll ${passed} live fee checks passed.`);
  process.exitCode = failed ? 1 : 0;
}

main().catch(async (e) => {
  console.error(e);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
