/**
 * Loose structural types that stand in for the generated Prisma model/where
 * types that used to come from `@prisma/client`.
 *
 * They are intentionally permissive: the Mongoose schemas in `models/` are the
 * real source of truth, and these annotations exist so the existing route code
 * keeps compiling without hand-rewriting every `where` builder.
 */

export type WhereInput = Record<string, any>;

/** JSON/Mixed field payload (was `Prisma.InputJsonValue`). */
export type JsonInput = any;

/**
 * A loosely-typed record for values returned by the MongoDB repository, whose
 * shape depends on the runtime `include`/`select` keys.
 */
export type Row = Record<string, any>;

export type ClassRow = Row & {
  id: string;
  name: string;
  grade: string;
  section: string | null;
  gradeCode: string | null;
  teacherId: string | null;
  academicSessionId: string;
};

export type StudentRow = Row & {
  id: string;
  userId: string;
  admissionNo: string;
  rollNumber: string;
  classId: string | null;
  active: boolean;
  profileImg: string | null;
};

export type FeePaymentRow = Row & {
  id: string;
  studentId: string;
  feeStructureId: string;
  amountPaid: number;
  remainAmount: number;
  status: string;
  paymentDate: Date | null;
  receiptNo: string | null;
};

export type ExpenseRow = Row & {
  id: string;
  title: string;
  amount: number;
  date: Date;
  categoryId: string | null;
  transaction: string;
};