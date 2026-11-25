/**
 * Fee module service: the ONLY code that writes fee balances.
 *
 * Model
 *   FeeStructure   what a class is charged
 *   FeePayment     a student's account against one structure (running balance)
 *   FeeTransaction one receipt; immutable, voided rather than edited
 *
 * Every balance on an account is recomputed from its transactions
 * (`recomputeAccounts`), so balances self-heal and can never drift from the
 * receipts that justify them.
 *
 * MongoDB here runs without a replica set (no multi-document transactions), so
 * writes are ordered so that a failure leaves the books recomputable: the
 * transaction is written first, then the account is recomputed from scratch.
 */

import { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Counter, FeePayment, FeeStructure, FeeTransaction } from "@/models/Finance";
import { Student } from "@/models/People";
import { AcademicSession, Class, SchoolSettings } from "@/models/School";
import { User } from "@/models/User";
import { Notification } from "@/models/Engagement";
import { FeeStatus, NotificationType, PaymentMethod } from "@/lib/enums";
import { money, sumMoney } from "@/lib/money";
import {
  checkPayment,
  computeBalance,
  dueForStudent,
  formatINR,
  formatReceiptNo,
  structureBreakdown,
  structureTotal,
  type AccountBalance,
} from "@/lib/fees/calc";
import type { FeeStructureInput, PaymentInput } from "@/lib/fees/validation";

// ------------------------------------------------------------------ errors

export class FeeError extends Error {
  constructor(message: string, readonly status: number = 400) {
    super(message);
    this.name = "FeeError";
  }
}

// ------------------------------------------------------------------ lean shapes

type Id = Types.ObjectId;

interface StructureDoc {
  _id: Id;
  classId: Id;
  categoryId?: Id | null;
  name?: string | null;
  examFee?: number | null;
  transportFee?: number | null;
  miscFee?: number | null;
  monthlyFee?: number | null;
  totalMonths?: number | null;
  total?: number | null;
  dueDate?: Date | null;
  isOptional?: boolean;
  createdAt?: Date;
}

interface AccountDoc {
  _id: Id;
  studentId: Id;
  feeStructureId: Id;
  includesTransport?: boolean | null;
  totalDue?: number | null;
  amountPaid: number;
  remainAmount: number;
  status: FeeStatus;
  discount?: number | null;
  lateFine?: number | null;
  paymentDate?: Date | null;
  paymentMode?: string | null;
  receiptNo?: string | null;
  remarks?: string | null;
  legacyMigrated?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

interface TransactionDoc {
  _id: Id;
  feePaymentId: Id;
  studentId: Id;
  feeStructureId: Id;
  receiptNo: string;
  amount: number;
  discount?: number | null;
  lateFine?: number | null;
  paymentMode?: string | null;
  paymentDate: Date;
  referenceNo?: string | null;
  remarks?: string | null;
  collectedById?: Id | null;
  isLegacy?: boolean;
  voided?: boolean;
  voidReason?: string | null;
  voidedAt?: Date | null;
  voidedById?: Id | null;
  createdAt?: Date;
}

interface StudentDoc {
  _id: Id;
  userId: Id;
  admissionNo: string;
  rollNumber: string;
  classId?: Id | null;
  active?: boolean;
  usesTransport?: boolean;
  fatherName?: string | null;
}

const oid = (id: string | Id): Id => (typeof id === "string" ? new Types.ObjectId(id) : id);
const str = (id: Id | null | undefined): string => (id ? String(id) : "");

function assertObjectId(id: string, what: string): void {
  if (!Types.ObjectId.isValid(id)) throw new FeeError(`Invalid ${what} id`, 400);
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ------------------------------------------------------------------ receipts

const RECEIPT_COUNTER = "fee-receipt";

/**
 * Allocate the next receipt number from an atomic counter.
 *
 * The old code used `count() + 1`, which repeats numbers after any deletion and
 * under concurrent requests. The counter is seeded past any numbers the old
 * scheme issued, and each candidate is checked against the unique index.
 */
async function allocateReceiptNo(): Promise<string> {
  const settings = await SchoolSettings.findOne()
    .sort({ createdAt: -1 })
    .select("receiptPrefix")
    .lean<{ receiptPrefix?: string | null }>();
  const prefix = settings?.receiptPrefix ?? "RCP";

  if (!(await Counter.exists({ _id: RECEIPT_COUNTER }))) {
    const [legacy, ledger] = await Promise.all([
      FeePayment.countDocuments({ receiptNo: { $nin: [null, ""] } }),
      FeeTransaction.countDocuments(),
    ]);
    await Counter.updateOne(
      { _id: RECEIPT_COUNTER },
      { $setOnInsert: { seq: legacy + ledger } },
      { upsert: true }
    );
  }

  for (let attempt = 0; attempt < 50; attempt++) {
    const counter = await Counter.findOneAndUpdate(
      { _id: RECEIPT_COUNTER },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    ).lean<{ seq: number }>();
    const candidate = formatReceiptNo(prefix, counter!.seq);
    if (!(await FeeTransaction.exists({ receiptNo: candidate }))) return candidate;
  }
  throw new FeeError("Could not allocate a receipt number, please retry", 503);
}

// ------------------------------------------------------------------ legacy migration

/**
 * Turn the running `amountPaid` of pre-ledger accounts into one legacy
 * transaction, so recomputing from transactions preserves what was collected.
 *
 * The legacy transaction reuses the account's `_id`, which makes creation
 * idempotent: if two requests race, the second insert fails on the duplicate
 * `_id` and is ignored. `recomputeAccounts` then marks the account migrated.
 */
async function migrateLegacyAccounts(accounts: AccountDoc[]): Promise<void> {
  for (const acc of accounts) {
    if (acc.legacyMigrated || money(acc.amountPaid) <= 0) continue;
    if (await FeeTransaction.exists({ feePaymentId: acc._id })) continue;

    const reuse =
      acc.receiptNo && !(await FeeTransaction.exists({ receiptNo: acc.receiptNo }))
        ? acc.receiptNo
        : await allocateReceiptNo();

    await FeeTransaction.create({
      _id: acc._id,
      feePaymentId: acc._id,
      studentId: acc.studentId,
      feeStructureId: acc.feeStructureId,
      receiptNo: reuse,
      amount: money(acc.amountPaid),
      discount: 0,
      lateFine: 0,
      paymentMode:
        acc.paymentMode && Object.values(PaymentMethod).includes(acc.paymentMode as PaymentMethod)
          ? acc.paymentMode
          : PaymentMethod.CASH,
      paymentDate: acc.paymentDate ?? acc.updatedAt ?? acc.createdAt ?? new Date(),
      remarks: acc.remarks || "Opening balance carried over from the previous fee system",
      isLegacy: true,
    }).catch((err: { code?: number }) => {
      if (err?.code !== 11000) throw err; // a concurrent request already migrated it
    });
  }
}

// ------------------------------------------------------------------ recompute

/**
 * Recompute and persist the balance of each account from its transactions.
 * Returns the fresh balances keyed by account id.
 */
export async function recomputeAccounts(
  accountIds: Array<string | Id>
): Promise<Map<string, AccountBalance>> {
  const result = new Map<string, AccountBalance>();
  if (accountIds.length === 0) return result;
  await connectDB();

  const ids = accountIds.map(oid);
  const accounts = await FeePayment.find({ _id: { $in: ids } }).lean<AccountDoc[]>();
  await migrateLegacyAccounts(accounts);

  const structureIds = [...new Set(accounts.map((a) => str(a.feeStructureId)))].map(oid);
  const studentIds = [...new Set(accounts.map((a) => str(a.studentId)))].map(oid);

  const [structures, students, txns] = await Promise.all([
    FeeStructure.find({ _id: { $in: structureIds } }).lean<StructureDoc[]>(),
    Student.find({ _id: { $in: studentIds } }).select("usesTransport").lean<StudentDoc[]>(),
    FeeTransaction.find({ feePaymentId: { $in: ids } })
      .select("feePaymentId amount discount lateFine voided paymentDate paymentMode receiptNo remarks createdAt")
      .lean<TransactionDoc[]>(),
  ]);

  const structureById = new Map(structures.map((s) => [str(s._id), s]));
  const studentById = new Map(students.map((s) => [str(s._id), s]));
  const txnsByAccount = new Map<string, TransactionDoc[]>();
  for (const t of txns) {
    const key = str(t.feePaymentId);
    txnsByAccount.set(key, [...(txnsByAccount.get(key) ?? []), t]);
  }

  const ops = accounts.map((acc) => {
    const key = str(acc._id);
    const structure = structureById.get(str(acc.feeStructureId));
    const includesTransport =
      acc.includesTransport ?? studentById.get(str(acc.studentId))?.usesTransport ?? false;
    const totalDue = structure
      ? dueForStudent(structure, includesTransport)
      : money(acc.totalDue ?? 0);

    const accTxns = txnsByAccount.get(key) ?? [];
    const balance = computeBalance(totalDue, accTxns);
    result.set(key, balance);

    const latest = accTxns
      .filter((t) => !t.voided)
      .sort(
        (a, b) =>
          b.paymentDate.getTime() - a.paymentDate.getTime() ||
          (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0)
      )[0];

    return {
      updateOne: {
        filter: { _id: acc._id },
        update: {
          $set: {
            includesTransport,
            totalDue: balance.totalDue,
            amountPaid: balance.amountPaid,
            remainAmount: balance.remainAmount,
            status: balance.status,
            discount: balance.discount,
            lateFine: balance.lateFine,
            paymentDate: latest?.paymentDate ?? null,
            paymentMode: latest?.paymentMode ?? null,
            receiptNo: latest?.receiptNo ?? null,
            legacyMigrated: true,
          },
        },
      },
    };
  });

  if (ops.length > 0) await FeePayment.bulkWrite(ops, { ordered: false });
  return result;
}

// ------------------------------------------------------------------ sync

/** Create any missing accounts for `students` on `structure`. */
async function ensureAccounts(structure: StructureDoc, students: StudentDoc[]): Promise<void> {
  if (students.length === 0) return;
  await FeePayment.bulkWrite(
    students.map((s) => ({
      updateOne: {
        filter: { studentId: s._id, feeStructureId: structure._id },
        update: {
          $setOnInsert: {
            studentId: s._id,
            feeStructureId: structure._id,
            includesTransport: !!s.usesTransport,
            totalDue: dueForStudent(structure, !!s.usesTransport),
            amountPaid: 0,
            remainAmount: dueForStudent(structure, !!s.usesTransport),
            status: FeeStatus.PENDING,
            discount: 0,
            lateFine: 0,
            legacyMigrated: true,
          },
        },
        upsert: true,
      },
    })),
    { ordered: false }
  );
}

/**
 * Bring every account on a structure up to date: create accounts for active
 * students in the class who lack one, then recompute all of them.
 */
export async function syncStructure(structureId: string | Id): Promise<{ accounts: number }> {
  await connectDB();
  const structure = await FeeStructure.findById(structureId).lean<StructureDoc>();
  if (!structure) throw new FeeError("Fee structure not found", 404);

  const students = await Student.find({ classId: structure.classId, active: true })
    .select("_id usesTransport")
    .lean<StudentDoc[]>();
  await ensureAccounts(structure, students);

  const accounts = await FeePayment.find({ feeStructureId: structure._id }).select("_id").lean<AccountDoc[]>();
  await recomputeAccounts(accounts.map((a) => a._id));
  return { accounts: accounts.length };
}

/** Sync every structure belonging to the given classes (e.g. after promotion). */
export async function syncClasses(classIds: Array<string | Id>): Promise<void> {
  if (classIds.length === 0) return;
  await connectDB();
  const structures = await FeeStructure.find({ classId: { $in: classIds.map(oid) } })
    .select("_id")
    .lean<StructureDoc[]>();
  for (const s of structures) await syncStructure(s._id);
}

/**
 * Bring one student's current-class accounts up to date. Call after the
 * student is created, changes class, or starts/stops using transport.
 *
 * When `previousClassId` is given and differs from the current class, the
 * untouched (no receipts) accounts from the old class are removed: they were
 * assigned in error. Accounts with receipts are always kept as arrears.
 */
export async function syncStudent(
  studentId: string,
  opts: { previousClassId?: string | null } = {}
): Promise<void> {
  await connectDB();
  const student = await Student.findById(studentId)
    .select("_id classId active usesTransport")
    .lean<StudentDoc>();
  if (!student) return;

  const currentClassId = str(student.classId);
  if (opts.previousClassId && opts.previousClassId !== currentClassId) {
    const oldStructures = await FeeStructure.find({ classId: oid(opts.previousClassId) })
      .select("_id")
      .lean<StructureDoc[]>();
    const oldAccounts = await FeePayment.find({
      studentId: student._id,
      feeStructureId: { $in: oldStructures.map((s) => s._id) },
      amountPaid: { $lte: 0 },
    })
      .select("_id")
      .lean<AccountDoc[]>();
    for (const acc of oldAccounts) {
      if (!(await FeeTransaction.exists({ feePaymentId: acc._id }))) {
        await FeePayment.deleteOne({ _id: acc._id });
      }
    }
  }

  if (!student.classId) return;
  const structures = await FeeStructure.find({ classId: student.classId }).lean<StructureDoc[]>();
  if (structures.length === 0) return;

  if (student.active !== false) {
    for (const s of structures) await ensureAccounts(s, [student]);
  }

  // Transport applies to the current class's accounts only; past years keep
  // the snapshot they were billed with.
  await FeePayment.updateMany(
    { studentId: student._id, feeStructureId: { $in: structures.map((s) => s._id) } },
    { $set: { includesTransport: !!student.usesTransport } }
  );
  const accounts = await FeePayment.find({
    studentId: student._id,
    feeStructureId: { $in: structures.map((s) => s._id) },
  })
    .select("_id")
    .lean<AccountDoc[]>();
  await recomputeAccounts(accounts.map((a) => a._id));
}

/** Run `syncStudent` without letting a fee problem fail the caller's request. */
export async function syncStudentSafely(
  studentId: string,
  opts: { previousClassId?: string | null } = {}
): Promise<void> {
  try {
    await syncStudent(studentId, opts);
  } catch (err) {
    console.error(`[fees] syncStudent(${studentId}) failed:`, err);
  }
}

// ------------------------------------------------------------------ structures

function structureFields(input: FeeStructureInput) {
  const amounts = {
    monthlyFee: input.monthlyFee ?? null,
    totalMonths: input.monthlyFee ? input.totalMonths ?? 12 : 12,
    examFee: input.examFee ?? null,
    transportFee: input.transportFee ?? null,
    miscFee: input.miscFee ?? null,
  };
  return {
    classId: oid(input.classId),
    categoryId: input.categoryId ? oid(input.categoryId) : null,
    name: input.name ?? null,
    ...amounts,
    monthlyFee: amounts.monthlyFee ? money(amounts.monthlyFee) : null,
    examFee: amounts.examFee != null ? money(amounts.examFee) : null,
    transportFee: amounts.transportFee != null ? money(amounts.transportFee) : null,
    miscFee: amounts.miscFee != null ? money(amounts.miscFee) : null,
    total: structureTotal(amounts),
    dueDate: input.dueDate ?? null,
    isOptional: input.isOptional ?? false,
  };
}

export async function createStructure(input: FeeStructureInput) {
  await connectDB();
  if (!(await Class.exists({ _id: oid(input.classId) }))) throw new FeeError("Class not found", 404);
  const created = await FeeStructure.create(structureFields(input));
  const { accounts } = await syncStructure(created._id);
  return { id: str(created._id), studentsBilled: accounts };
}

export async function updateStructure(id: string, input: FeeStructureInput) {
  assertObjectId(id, "fee structure");
  await connectDB();
  const existing = await FeeStructure.findById(id).lean<StructureDoc>();
  if (!existing) throw new FeeError("Fee structure not found", 404);

  if (str(existing.classId) !== input.classId) {
    const hasMoney =
      (await FeeTransaction.exists({ feeStructureId: existing._id })) ||
      (await FeePayment.exists({ feeStructureId: existing._id, amountPaid: { $gt: 0 } }));
    if (hasMoney) {
      throw new FeeError(
        "Payments have already been collected on this structure, so its class cannot change. Create a new structure instead.",
        409
      );
    }
    await FeePayment.deleteMany({ feeStructureId: existing._id });
  }

  await FeeStructure.updateOne({ _id: existing._id }, { $set: structureFields(input) });
  const { accounts } = await syncStructure(existing._id);
  return { id, studentsBilled: accounts };
}

export async function deleteStructure(id: string): Promise<void> {
  assertObjectId(id, "fee structure");
  await connectDB();
  const existing = await FeeStructure.findById(id).select("_id").lean<StructureDoc>();
  if (!existing) throw new FeeError("Fee structure not found", 404);

  const receipts = await FeeTransaction.countDocuments({ feeStructureId: existing._id, voided: { $ne: true } });
  const legacyPaid = await FeePayment.countDocuments({ feeStructureId: existing._id, amountPaid: { $gt: 0 } });
  if (receipts > 0 || legacyPaid > 0) {
    throw new FeeError(
      `This structure has ${Math.max(receipts, legacyPaid)} payment(s) recorded. Void them first, or keep the structure for the records.`,
      409
    );
  }

  await FeeTransaction.deleteMany({ feeStructureId: existing._id });
  await FeePayment.deleteMany({ feeStructureId: existing._id });
  await FeeStructure.deleteOne({ _id: existing._id });
}

// ------------------------------------------------------------------ payments

export async function recordPayment(input: PaymentInput, actorUserId: string) {
  await connectDB();

  const [student, structure] = await Promise.all([
    Student.findById(input.studentId).select("_id classId usesTransport active").lean<StudentDoc>(),
    FeeStructure.findById(input.feeStructureId).lean<StructureDoc>(),
  ]);
  if (!student) throw new FeeError("Student not found", 404);
  if (!structure) throw new FeeError("Fee structure not found", 404);

  let account = await FeePayment.findOne({
    studentId: student._id,
    feeStructureId: structure._id,
  }).lean<AccountDoc>();

  if (!account) {
    if (str(student.classId) !== str(structure.classId)) {
      throw new FeeError("This fee structure belongs to a different class than the student's", 400);
    }
    await ensureAccounts(structure, [student]);
    account = await FeePayment.findOne({ studentId: student._id, feeStructureId: structure._id }).lean<AccountDoc>();
    if (!account) throw new FeeError("Could not open a fee account for this student", 500);
  }

  const before = (await recomputeAccounts([account._id])).get(str(account._id))!;
  const check = checkPayment(before, input);
  if (!check.ok) throw new FeeError(check.error, 400);

  const receiptNo = await allocateReceiptNo();
  const txn = await FeeTransaction.create({
    feePaymentId: account._id,
    studentId: student._id,
    feeStructureId: structure._id,
    receiptNo,
    amount: money(input.amount),
    discount: money(input.discount),
    lateFine: money(input.lateFine),
    paymentMode: input.paymentMode,
    paymentDate: input.paymentDate ?? new Date(),
    referenceNo: input.referenceNo ?? null,
    remarks: input.remarks ?? null,
    collectedById: Types.ObjectId.isValid(actorUserId) ? oid(actorUserId) : null,
  });

  const after = (await recomputeAccounts([account._id])).get(str(account._id))!;
  return { id: str(txn._id), receiptNo, accountId: str(account._id), balance: after };
}

export async function voidTransaction(id: string, reason: string, actorUserId: string) {
  assertObjectId(id, "receipt");
  await connectDB();
  const txn = await FeeTransaction.findById(id).lean<TransactionDoc>();
  if (!txn) throw new FeeError("Receipt not found", 404);
  if (txn.voided) throw new FeeError("This receipt is already void", 409);

  await FeeTransaction.updateOne(
    { _id: txn._id, voided: { $ne: true } },
    {
      $set: {
        voided: true,
        voidReason: reason,
        voidedAt: new Date(),
        voidedById: Types.ObjectId.isValid(actorUserId) ? oid(actorUserId) : null,
      },
    }
  );
  const balance = (await recomputeAccounts([txn.feePaymentId])).get(str(txn.feePaymentId));
  return { id, receiptNo: txn.receiptNo, studentId: str(txn.studentId), amount: txn.amount, balance };
}

// ------------------------------------------------------------------ read models

async function namesForUsers(ids: Array<Id | null | undefined>): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter(Boolean).map((i) => str(i)))];
  if (unique.length === 0) return new Map();
  const users = await User.find({ _id: { $in: unique.map(oid) } })
    .select("name")
    .lean<Array<{ _id: Id; name: string }>>();
  return new Map(users.map((u) => [str(u._id), u.name]));
}

export interface ReceiptView {
  id: string;
  receiptNo: string;
  amount: number;
  discount: number;
  lateFine: number;
  paymentMode: string;
  paymentDate: string;
  referenceNo: string | null;
  remarks: string | null;
  collectedBy: string | null;
  isLegacy: boolean;
  voided: boolean;
  voidReason: string | null;
  voidedAt: string | null;
  voidedBy: string | null;
}

function toReceiptView(t: TransactionDoc, names: Map<string, string>): ReceiptView {
  return {
    id: str(t._id),
    receiptNo: t.receiptNo,
    amount: money(t.amount),
    discount: money(t.discount),
    lateFine: money(t.lateFine),
    paymentMode: t.paymentMode ?? PaymentMethod.CASH,
    paymentDate: t.paymentDate.toISOString(),
    referenceNo: t.referenceNo ?? null,
    remarks: t.remarks ?? null,
    collectedBy: t.collectedById ? names.get(str(t.collectedById)) ?? null : null,
    isLegacy: !!t.isLegacy,
    voided: !!t.voided,
    voidReason: t.voidReason ?? null,
    voidedAt: t.voidedAt ? t.voidedAt.toISOString() : null,
    voidedBy: t.voidedById ? names.get(str(t.voidedById)) ?? null : null,
  };
}

async function schoolHeader() {
  const s = await SchoolSettings.findOne()
    .sort({ createdAt: -1 })
    .select("name address contactEmail contactPhone logoUrl")
    .lean<{
      name: string;
      address?: string | null;
      contactEmail?: string | null;
      contactPhone?: string | null;
      logoUrl?: string | null;
    }>();
  return s
    ? {
        name: s.name,
        address: s.address ?? null,
        contactEmail: s.contactEmail ?? null,
        contactPhone: s.contactPhone ?? null,
        logoUrl: s.logoUrl ?? null,
      }
    : null;
}

async function studentHeader(studentId: Id) {
  const student = await Student.findById(studentId).lean<StudentDoc>();
  if (!student) return null;
  const [user, cls] = await Promise.all([
    User.findById(student.userId)
      .select("name email phone")
      .lean<{ name: string; email: string; phone?: string | null }>(),
    student.classId
      ? Class.findById(student.classId).select("name grade section").lean<{ name: string; grade: string; section?: string | null }>()
      : null,
  ]);
  return {
    id: str(student._id),
    userId: str(student.userId),
    name: user?.name ?? "Unknown student",
    email: user?.email ?? "",
    phone: user?.phone ?? null,
    admissionNo: student.admissionNo,
    rollNumber: student.rollNumber,
    className: cls?.name ?? "",
    fatherName: student.fatherName ?? null,
    usesTransport: !!student.usesTransport,
    active: student.active !== false,
  };
}

/** Everything needed to print one receipt. */
export async function getReceipt(id: string) {
  assertObjectId(id, "receipt");
  await connectDB();

  let txn = await FeeTransaction.findById(id).lean<TransactionDoc>();
  if (!txn) {
    // Old links pointed at the account id; show its latest receipt instead.
    const account = await FeePayment.findById(id).select("_id").lean<AccountDoc>();
    if (account) {
      await recomputeAccounts([account._id]);
      txn = await FeeTransaction.findOne({ feePaymentId: account._id })
        .sort({ paymentDate: -1, createdAt: -1 })
        .lean<TransactionDoc>();
    }
  }
  if (!txn) throw new FeeError("Receipt not found", 404);

  const [account, structure, student, school, names] = await Promise.all([
    FeePayment.findById(txn.feePaymentId).lean<AccountDoc>(),
    FeeStructure.findById(txn.feeStructureId).lean<StructureDoc>(),
    studentHeader(txn.studentId),
    schoolHeader(),
    namesForUsers([txn.collectedById, txn.voidedById]),
  ]);
  if (!student) throw new FeeError("Student for this receipt no longer exists", 404);

  // Balance as it stood right after this receipt (not today's balance), so a
  // reprinted receipt always shows the same numbers.
  const history = await FeeTransaction.find({ feePaymentId: txn.feePaymentId })
    .select("amount discount lateFine voided paymentDate createdAt")
    .lean<TransactionDoc[]>();
  const stamp = (t: TransactionDoc) => [t.paymentDate.getTime(), t.createdAt?.getTime() ?? 0] as const;
  const [p0, c0] = stamp(txn);
  const upToThis = history.filter((t) => {
    const [p, c] = stamp(t);
    return p < p0 || (p === p0 && c <= c0);
  });
  const totalDue = account?.totalDue ?? (structure ? dueForStudent(structure, !!account?.includesTransport) : 0);
  const balanceAfter = computeBalance(totalDue, upToThis);

  return {
    school,
    student,
    structure: structure
      ? { id: str(structure._id), name: structure.name ?? "Fee", ...structureBreakdown(structure) }
      : { id: "", name: "Deleted structure", tuition: 0, exam: 0, misc: 0, transport: 0, total: 0 },
    receipt: toReceiptView(txn, names),
    balanceAfter,
  };
}

export type ReceiptData = Awaited<ReturnType<typeof getReceipt>>;

export interface StatementAccount {
  accountId: string;
  structureId: string;
  structureName: string;
  className: string;
  session: { id: string; name: string; isActive: boolean } | null;
  dueDate: string | null;
  isOverdue: boolean;
  includesTransport: boolean;
  breakdown: ReturnType<typeof structureBreakdown>;
  balance: AccountBalance;
  receipts: ReceiptView[];
}

/** A student's complete fee position: every account, balance and receipt. */
export async function getStudentStatement(studentId: string) {
  assertObjectId(studentId, "student");
  await connectDB();

  const student = await studentHeader(oid(studentId));
  if (!student) throw new FeeError("Student not found", 404);

  // Make sure the current class's accounts exist before reporting on them.
  await syncStudent(studentId);

  const accounts = await FeePayment.find({ studentId: oid(studentId) }).lean<AccountDoc[]>();
  const balances = await recomputeAccounts(accounts.map((a) => a._id));

  const structures = await FeeStructure.find({
    _id: { $in: accounts.map((a) => a.feeStructureId) },
  }).lean<StructureDoc[]>();
  const classes = await Class.find({ _id: { $in: structures.map((s) => s.classId) } })
    .select("name academicSessionId")
    .lean<Array<{ _id: Id; name: string; academicSessionId?: Id }>>();
  const sessions = await AcademicSession.find({
    _id: { $in: classes.map((c) => c.academicSessionId).filter(Boolean) },
  })
    .select("name isActive")
    .lean<Array<{ _id: Id; name: string; isActive?: boolean }>>();
  const txns = await FeeTransaction.find({ studentId: oid(studentId) })
    .sort({ paymentDate: -1, createdAt: -1 })
    .lean<TransactionDoc[]>();
  const names = await namesForUsers(txns.flatMap((t) => [t.collectedById, t.voidedById]));

  const structureById = new Map(structures.map((s) => [str(s._id), s]));
  const classById = new Map(classes.map((c) => [str(c._id), c]));
  const sessionById = new Map(sessions.map((s) => [str(s._id), s]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const rows: StatementAccount[] = accounts
    .map((acc) => {
      const structure = structureById.get(str(acc.feeStructureId));
      const cls = structure ? classById.get(str(structure.classId)) : undefined;
      const sess = cls?.academicSessionId ? sessionById.get(str(cls.academicSessionId)) : undefined;
      const balance = balances.get(str(acc._id))!;
      const dueDate = structure?.dueDate ?? null;
      return {
        accountId: str(acc._id),
        structureId: str(acc.feeStructureId),
        structureName: structure?.name || "Fee",
        className: cls?.name ?? "",
        session: sess ? { id: str(sess._id), name: sess.name, isActive: !!sess.isActive } : null,
        dueDate: dueDate ? dueDate.toISOString() : null,
        isOverdue: !!dueDate && dueDate < today && balance.remainAmount > 0,
        includesTransport: !!acc.includesTransport,
        breakdown: structure ? structureBreakdown(structure) : structureBreakdown({}),
        balance,
        receipts: txns.filter((t) => str(t.feePaymentId) === str(acc._id)).map((t) => toReceiptView(t, names)),
      };
    })
    .sort(
      (a, b) =>
        Number(b.session?.isActive ?? false) - Number(a.session?.isActive ?? false) ||
        (b.session?.name ?? "").localeCompare(a.session?.name ?? "") ||
        a.structureName.localeCompare(b.structureName)
    );

  const live = rows.map((r) => r.balance);
  return {
    school: await schoolHeader(),
    student,
    accounts: rows,
    summary: {
      totalPayable: sumMoney(live.map((b) => b.netPayable)),
      totalPaid: sumMoney(live.map((b) => b.amountPaid)),
      totalDiscount: sumMoney(live.map((b) => b.discount)),
      totalRemaining: sumMoney(live.map((b) => b.remainAmount)),
      overdue: sumMoney(rows.filter((r) => r.isOverdue).map((r) => r.balance.remainAmount)),
      receiptCount: txns.filter((t) => !t.voided).length,
    },
  };
}

export type StudentStatement = Awaited<ReturnType<typeof getStudentStatement>>;

/** Lightweight list of a student's accounts, for the collect-payment form. */
export async function getStudentAccounts(studentId: string) {
  const statement = await getStudentStatement(studentId);
  return {
    student: statement.student,
    accounts: statement.accounts.map((a) => ({
      accountId: a.accountId,
      structureId: a.structureId,
      structureName: a.structureName,
      className: a.className,
      sessionName: a.session?.name ?? null,
      dueDate: a.dueDate,
      isOverdue: a.isOverdue,
      balance: a.balance,
    })),
  };
}

// ------------------------------------------------------------------ admin lists

export interface TransactionFilters {
  page?: number;
  pageSize?: number;
  q?: string | null;
  classId?: string | null;
  mode?: string | null;
  from?: Date | null;
  to?: Date | null;
  includeVoided?: boolean;
}

/** Search students by name / admission no. Returns matching student ids. */
async function findStudentIds(q: string): Promise<Id[]> {
  const rx = new RegExp(escapeRegex(q.trim()), "i");
  const users = await User.find({ role: "STUDENT", name: rx }).select("_id").lean<Array<{ _id: Id }>>();
  const students = await Student.find({
    $or: [{ admissionNo: rx }, { userId: { $in: users.map((u) => u._id) } }],
  })
    .select("_id")
    .lean<StudentDoc[]>();
  return students.map((s) => s._id);
}

export async function listTransactions(filters: TransactionFilters) {
  await connectDB();
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(5, filters.pageSize ?? 20));

  const where: Record<string, unknown> = {};
  if (!filters.includeVoided) where.voided = { $ne: true };
  if (filters.mode && Object.values(PaymentMethod).includes(filters.mode as PaymentMethod)) {
    where.paymentMode = filters.mode;
  }
  if (filters.from || filters.to) {
    const range: Record<string, Date> = {};
    if (filters.from) range.$gte = filters.from;
    if (filters.to) {
      const end = new Date(filters.to);
      end.setHours(23, 59, 59, 999);
      range.$lte = end;
    }
    where.paymentDate = range;
  }
  if (filters.classId && Types.ObjectId.isValid(filters.classId)) {
    const structures = await FeeStructure.find({ classId: oid(filters.classId) }).select("_id").lean<StructureDoc[]>();
    where.feeStructureId = { $in: structures.map((s) => s._id) };
  }
  if (filters.q?.trim()) {
    const studentIds = await findStudentIds(filters.q);
    where.$or = [
      { studentId: { $in: studentIds } },
      { receiptNo: new RegExp(escapeRegex(filters.q.trim()), "i") },
    ];
  }

  const [total, rows, sums] = await Promise.all([
    FeeTransaction.countDocuments(where),
    FeeTransaction.find(where)
      .sort({ paymentDate: -1, createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<TransactionDoc[]>(),
    FeeTransaction.aggregate<{ amount: number; discount: number }>([
      { $match: { ...where, voided: { $ne: true } } },
      { $group: { _id: null, amount: { $sum: "$amount" }, discount: { $sum: "$discount" } } },
    ]),
  ]);

  const items = await decorateTransactions(rows);
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    totals: { amount: money(sums[0]?.amount ?? 0), discount: money(sums[0]?.discount ?? 0) },
  };
}

/** Attach student / class / structure / collector names to raw transactions. */
async function decorateTransactions(rows: TransactionDoc[]) {
  const students = await Student.find({ _id: { $in: rows.map((r) => r.studentId) } })
    .select("userId admissionNo classId")
    .lean<StudentDoc[]>();
  const [users, structures, names] = await Promise.all([
    User.find({ _id: { $in: students.map((s) => s.userId) } }).select("name").lean<Array<{ _id: Id; name: string }>>(),
    FeeStructure.find({ _id: { $in: rows.map((r) => r.feeStructureId) } })
      .select("name classId")
      .lean<StructureDoc[]>(),
    namesForUsers(rows.flatMap((r) => [r.collectedById, r.voidedById])),
  ]);
  const classes = await Class.find({ _id: { $in: structures.map((s) => s.classId) } })
    .select("name")
    .lean<Array<{ _id: Id; name: string }>>();

  const studentById = new Map(students.map((s) => [str(s._id), s]));
  const userName = new Map(users.map((u) => [str(u._id), u.name]));
  const structureById = new Map(structures.map((s) => [str(s._id), s]));
  const className = new Map(classes.map((c) => [str(c._id), c.name]));

  return rows.map((r) => {
    const st = studentById.get(str(r.studentId));
    const fs = structureById.get(str(r.feeStructureId));
    return {
      ...toReceiptView(r, names),
      student: {
        id: str(r.studentId),
        name: st ? userName.get(str(st.userId)) ?? "Unknown" : "Deleted student",
        admissionNo: st?.admissionNo ?? "",
      },
      structureName: fs?.name || "Fee",
      className: fs ? className.get(str(fs.classId)) ?? "" : "",
    };
  });
}

export type TransactionRow = Awaited<ReturnType<typeof decorateTransactions>>[number];

export interface DueFilters {
  classId?: string | null;
  q?: string | null;
  overdueOnly?: boolean;
}

/** Students with an outstanding balance, one row per student. */
export async function listDues(filters: DueFilters = {}) {
  await connectDB();
  const where: Record<string, unknown> = { remainAmount: { $gt: 0 } };

  const studentFilter: Record<string, unknown> = { active: true };
  if (filters.classId && Types.ObjectId.isValid(filters.classId)) studentFilter.classId = oid(filters.classId);
  if (filters.q?.trim()) studentFilter._id = { $in: await findStudentIds(filters.q) };
  const students = await Student.find(studentFilter)
    .select("userId admissionNo rollNumber classId fatherName")
    .lean<StudentDoc[]>();
  where.studentId = { $in: students.map((s) => s._id) };

  const accounts = await FeePayment.find(where).lean<AccountDoc[]>();
  const structures = await FeeStructure.find({ _id: { $in: accounts.map((a) => a.feeStructureId) } })
    .select("name dueDate")
    .lean<StructureDoc[]>();
  const [users, classes] = await Promise.all([
    User.find({ _id: { $in: students.map((s) => s.userId) } })
      .select("name phone")
      .lean<Array<{ _id: Id; name: string; phone?: string | null }>>(),
    Class.find({ _id: { $in: students.map((s) => s.classId).filter(Boolean) } })
      .select("name")
      .lean<Array<{ _id: Id; name: string }>>(),
  ]);

  const structureById = new Map(structures.map((s) => [str(s._id), s]));
  const userById = new Map(users.map((u) => [str(u._id), u]));
  const classById = new Map(classes.map((c) => [str(c._id), c.name]));
  const studentById = new Map(students.map((s) => [str(s._id), s]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const byStudent = new Map<
    string,
    { due: number; paid: number; remaining: number; overdue: number; structures: string[]; oldestDue: Date | null }
  >();
  for (const acc of accounts) {
    const key = str(acc.studentId);
    const fs = structureById.get(str(acc.feeStructureId));
    const isOverdue = !!fs?.dueDate && fs.dueDate < today;
    const row = byStudent.get(key) ?? { due: 0, paid: 0, remaining: 0, overdue: 0, structures: [], oldestDue: null };
    row.due = money(row.due + (acc.totalDue ?? 0) - (acc.discount ?? 0) + (acc.lateFine ?? 0));
    row.paid = money(row.paid + acc.amountPaid);
    row.remaining = money(row.remaining + acc.remainAmount);
    if (isOverdue) row.overdue = money(row.overdue + acc.remainAmount);
    row.structures.push(fs?.name || "Fee");
    if (fs?.dueDate && (!row.oldestDue || fs.dueDate < row.oldestDue)) row.oldestDue = fs.dueDate;
    byStudent.set(key, row);
  }

  const items = [...byStudent.entries()]
    .map(([studentId, row]) => {
      const st = studentById.get(studentId)!;
      const user = userById.get(str(st.userId));
      return {
        studentId,
        userId: str(st.userId),
        name: user?.name ?? "Unknown",
        phone: user?.phone ?? null,
        admissionNo: st.admissionNo,
        rollNumber: st.rollNumber,
        fatherName: st.fatherName ?? null,
        className: st.classId ? classById.get(str(st.classId)) ?? "" : "",
        structures: row.structures,
        payable: row.due,
        paid: row.paid,
        remaining: row.remaining,
        overdue: row.overdue,
        oldestDueDate: row.oldestDue ? row.oldestDue.toISOString() : null,
      };
    })
    .filter((r) => !filters.overdueOnly || r.overdue > 0)
    .sort((a, b) => b.overdue - a.overdue || b.remaining - a.remaining);

  return {
    items,
    totals: {
      students: items.length,
      remaining: sumMoney(items.map((i) => i.remaining)),
      overdue: sumMoney(items.map((i) => i.overdue)),
    },
  };
}

export type DueRow = Awaited<ReturnType<typeof listDues>>["items"][number];

/** Notify each student (by user id) of their outstanding balance. */
export async function sendDueReminders(studentIds: string[]): Promise<{ sent: number }> {
  await connectDB();
  const valid = studentIds.filter((id) => Types.ObjectId.isValid(id));
  if (valid.length === 0) return { sent: 0 };

  const { items } = await listDues({});
  const targets = items.filter((i) => valid.includes(i.studentId));
  if (targets.length === 0) return { sent: 0 };

  await Notification.insertMany(
    targets.map((t) => ({
      userId: oid(t.userId),
      type: NotificationType.FEE_REMINDER,
      title: t.overdue > 0 ? "Fee overdue" : "Fee reminder",
      message:
        t.overdue > 0
          ? `₹${formatINR(t.overdue)} of your fees is overdue (total outstanding ₹${formatINR(t.remaining)}). Please clear it at the earliest.`
          : `You have an outstanding fee balance of ₹${formatINR(t.remaining)}. Please pay before the due date.`,
    }))
  );
  return { sent: targets.length };
}

// ------------------------------------------------------------------ overview

const MONTHS_BACK = 6;

/** Numbers for the admin fee dashboard. */
export async function getFeeOverview() {
  await connectDB();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const trendStart = new Date(now.getFullYear(), now.getMonth() - (MONTHS_BACK - 1), 1);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [collected, thisMonth, trendRaw, accountTotals, statusCounts, byStructure, recentRaw, overdueRaw] =
    await Promise.all([
      FeeTransaction.aggregate<{ total: number; count: number }>([
        { $match: { voided: { $ne: true } } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      FeeTransaction.aggregate<{ total: number; count: number }>([
        { $match: { voided: { $ne: true }, paymentDate: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
      ]),
      FeeTransaction.aggregate<{ _id: { y: number; m: number }; total: number }>([
        { $match: { voided: { $ne: true }, paymentDate: { $gte: trendStart } } },
        {
          $group: {
            _id: { y: { $year: "$paymentDate" }, m: { $month: "$paymentDate" } },
            total: { $sum: "$amount" },
          },
        },
      ]),
      FeePayment.aggregate<{ paid: number; remaining: number; discount: number; fine: number; due: number }>([
        {
          $group: {
            _id: null,
            paid: { $sum: "$amountPaid" },
            remaining: { $sum: "$remainAmount" },
            discount: { $sum: { $ifNull: ["$discount", 0] } },
            fine: { $sum: { $ifNull: ["$lateFine", 0] } },
            due: { $sum: { $ifNull: ["$totalDue", 0] } },
          },
        },
      ]),
      FeePayment.aggregate<{ _id: FeeStatus; count: number; amount: number }>([
        { $group: { _id: "$status", count: { $sum: 1 }, amount: { $sum: "$remainAmount" } } },
      ]),
      FeePayment.aggregate<{ _id: Id; paid: number; remaining: number }>([
        {
          $group: {
            _id: "$feeStructureId",
            paid: { $sum: "$amountPaid" },
            remaining: { $sum: "$remainAmount" },
          },
        },
      ]),
      FeeTransaction.find({ voided: { $ne: true } })
        .sort({ paymentDate: -1, createdAt: -1 })
        .limit(8)
        .lean<TransactionDoc[]>(),
      (async () => {
        const overdueStructures = await FeeStructure.find({ dueDate: { $lt: today } }).select("_id").lean<StructureDoc[]>();
        return FeePayment.aggregate<{ total: number; students: string[] }>([
          { $match: { remainAmount: { $gt: 0 }, feeStructureId: { $in: overdueStructures.map((s) => s._id) } } },
          { $group: { _id: null, total: { $sum: "$remainAmount" }, students: { $addToSet: "$studentId" } } },
        ]);
      })(),
    ]);

  // Class-wise collection, folding structures into their classes.
  const structures = await FeeStructure.find({ _id: { $in: byStructure.map((b) => b._id) } })
    .select("classId")
    .lean<StructureDoc[]>();
  const classOf = new Map(structures.map((s) => [str(s._id), str(s.classId)]));
  const classes = await Class.find({ _id: { $in: [...new Set(classOf.values())].map(oid) } })
    .select("name grade section")
    .lean<Array<{ _id: Id; name: string }>>();
  const classAgg = new Map<string, { paid: number; remaining: number }>();
  for (const b of byStructure) {
    const cid = classOf.get(str(b._id));
    if (!cid) continue;
    const row = classAgg.get(cid) ?? { paid: 0, remaining: 0 };
    row.paid = money(row.paid + b.paid);
    row.remaining = money(row.remaining + b.remaining);
    classAgg.set(cid, row);
  }
  const byClass = classes
    .map((c) => {
      const row = classAgg.get(str(c._id)) ?? { paid: 0, remaining: 0 };
      const payable = money(row.paid + row.remaining);
      return {
        classId: str(c._id),
        className: c.name,
        paid: row.paid,
        remaining: row.remaining,
        payable,
        rate: payable > 0 ? Math.round((row.paid / payable) * 100) : 0,
      };
    })
    .sort((a, b) => a.className.localeCompare(b.className, undefined, { numeric: true }));

  const trend = Array.from({ length: MONTHS_BACK }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (MONTHS_BACK - 1) + i, 1);
    const hit = trendRaw.find((t) => t._id.y === d.getFullYear() && t._id.m === d.getMonth() + 1);
    return {
      month: d.toLocaleString("en-IN", { month: "short" }),
      year: d.getFullYear(),
      total: money(hit?.total ?? 0),
    };
  });

  const totals = accountTotals[0] ?? { paid: 0, remaining: 0, discount: 0, fine: 0, due: 0 };
  const payable = money(totals.paid + totals.remaining);
  const counts = Object.fromEntries(statusCounts.map((s) => [s._id, s.count])) as Partial<Record<FeeStatus, number>>;

  return {
    collected: money(collected[0]?.total ?? 0),
    receipts: collected[0]?.count ?? 0,
    collectedThisMonth: money(thisMonth[0]?.total ?? 0),
    receiptsThisMonth: thisMonth[0]?.count ?? 0,
    outstanding: money(totals.remaining),
    concessions: money(totals.discount),
    collectionRate: payable > 0 ? Math.round((totals.paid / payable) * 100) : 0,
    overdue: money(overdueRaw[0]?.total ?? 0),
    overdueStudents: overdueRaw[0]?.students.length ?? 0,
    accounts: {
      paid: counts.PAID ?? 0,
      partial: counts.PARTIAL ?? 0,
      pending: counts.PENDING ?? 0,
    },
    trend,
    byClass,
    recent: await decorateTransactions(recentRaw),
  };
}

export type FeeOverview = Awaited<ReturnType<typeof getFeeOverview>>;

// ------------------------------------------------------------------ maintenance

/**
 * Rebuild every balance from scratch: merge duplicate accounts, migrate legacy
 * balances into receipts, bill missing students and recompute everything.
 * Safe to run repeatedly. Used by `npm run fees:migrate` and the admin button.
 */
export async function recalculateAll(): Promise<{
  mergedDuplicates: number;
  structures: number;
  accounts: number;
}> {
  await connectDB();

  // 1. Merge duplicate accounts (the old code could create two per pair).
  const dupes = await FeePayment.aggregate<{ _id: { s: Id; f: Id }; ids: Id[] }>([
    { $group: { _id: { s: "$studentId", f: "$feeStructureId" }, ids: { $push: "$_id" }, n: { $sum: 1 } } },
    { $match: { n: { $gt: 1 } } },
  ]);
  let mergedDuplicates = 0;
  for (const d of dupes) {
    const docs = await FeePayment.find({ _id: { $in: d.ids } }).sort({ createdAt: 1 }).lean<AccountDoc[]>();
    // Each duplicate's collected money becomes a legacy receipt first...
    await migrateLegacyAccounts(docs);
    const [keep, ...rest] = docs;
    // ...then those receipts are re-pointed at the surviving account.
    await FeeTransaction.updateMany(
      { feePaymentId: { $in: rest.map((r) => r._id) } },
      { $set: { feePaymentId: keep._id } }
    );
    await FeePayment.deleteMany({ _id: { $in: rest.map((r) => r._id) } });
    mergedDuplicates += rest.length;
  }

  // 2. Remove accounts whose structure no longer exists and hold no money.
  const structureIds = (await FeeStructure.find().select("_id").lean<StructureDoc[]>()).map((s) => s._id);
  const orphans = await FeePayment.find({ feeStructureId: { $nin: structureIds } }).select("_id amountPaid").lean<AccountDoc[]>();
  for (const o of orphans) {
    if (money(o.amountPaid) <= 0 && !(await FeeTransaction.exists({ feePaymentId: o._id }))) {
      await FeePayment.deleteOne({ _id: o._id });
    }
  }

  // 3. Fix stored structure totals (the old monthly mode dropped components).
  const all = await FeeStructure.find().lean<StructureDoc[]>();
  for (const s of all) {
    const total = structureTotal(s);
    if (money(s.total) !== total) await FeeStructure.updateOne({ _id: s._id }, { $set: { total } });
  }

  // 4. Bill missing students and recompute every account.
  for (const s of all) await syncStructure(s._id);
  const remaining = await FeePayment.find({ feeStructureId: { $nin: all.map((s) => s._id) } }).select("_id").lean<AccountDoc[]>();
  await recomputeAccounts(remaining.map((a) => a._id));

  // 5. Build the new indexes now that duplicates are gone.
  await FeePayment.syncIndexes();
  await FeeTransaction.syncIndexes();

  return {
    mergedDuplicates,
    structures: all.length,
    accounts: await FeePayment.countDocuments(),
  };
}

// ------------------------------------------------------------------ pickers

/** Student lookup for the collect-fee form (name, admission no or roll no). */
export async function searchStudents(q: string, limit = 12) {
  await connectDB();
  const term = q.trim();
  if (term.length < 2) return [];
  const rx = new RegExp(escapeRegex(term), "i");
  const users = await User.find({ role: "STUDENT", name: rx }).select("_id").limit(50).lean<Array<{ _id: Id }>>();
  const students = await Student.find({
    $or: [{ admissionNo: rx }, { rollNumber: term }, { userId: { $in: users.map((u) => u._id) } }],
  })
    .select("userId admissionNo rollNumber classId active")
    .limit(limit)
    .lean<StudentDoc[]>();

  const [names, classes, dues] = await Promise.all([
    User.find({ _id: { $in: students.map((s) => s.userId) } }).select("name").lean<Array<{ _id: Id; name: string }>>(),
    Class.find({ _id: { $in: students.map((s) => s.classId).filter(Boolean) } })
      .select("name")
      .lean<Array<{ _id: Id; name: string }>>(),
    FeePayment.aggregate<{ _id: Id; remaining: number }>([
      { $match: { studentId: { $in: students.map((s) => s._id) } } },
      { $group: { _id: "$studentId", remaining: { $sum: "$remainAmount" } } },
    ]),
  ]);
  const nameById = new Map(names.map((u) => [str(u._id), u.name]));
  const classById = new Map(classes.map((c) => [str(c._id), c.name]));
  const dueById = new Map(dues.map((d) => [str(d._id), money(d.remaining)]));

  return students.map((s) => ({
    id: str(s._id),
    name: nameById.get(str(s.userId)) ?? "Unknown",
    admissionNo: s.admissionNo,
    rollNumber: s.rollNumber,
    className: s.classId ? classById.get(str(s.classId)) ?? "" : "",
    active: s.active !== false,
    outstanding: dueById.get(str(s._id)) ?? 0,
  }));
}
