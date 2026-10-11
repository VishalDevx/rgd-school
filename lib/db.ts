import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Repository } from "@/lib/db/repository";

import {
  User,
  Account,
  Session,
  VerificationToken,
} from "@/models/User";
import {
  SchoolSettings,
  AcademicSession,
  Class,
  Subject,
} from "@/models/School";
import {
  Staff,
  StaffDocument,
  StaffAttendance,
  Student,
  StudentDocument,
} from "@/models/People";
import {
  FeeCategory,
  FeeStructure,
  FeePayment,
  ExpenseCategory,
  Expense,
  TransportAssignment,
} from "@/models/Finance";
import {
  Attendance,
  Exam,
  ExamDateSheet,
  Result,
  Timetable,
  Homework,
  HomeworkSubmission,
  StudyMaterial,
} from "@/models/Academic";
import {
  Announcement,
  AnnouncementVisibility,
  Certificate,
  IDCard,
  Notification,
  Leave,
  AuditLog,
} from "@/models/Engagement";

/**
 * The data-access entry point, replacing `db` from `@/lib/db`.
 *
 * Each property is a `Repository` over the matching Mongoose model, exposing the
 * Prisma-shaped API the routes were written against.
 */

function repo(modelName: keyof typeof mongoose.models & string, model: any): Repository {
  return new Repository(model as any, modelName);
}

export const db = {
  // Identity + auth
  user: repo("User", User),
  account: repo("Account", Account),
  session: repo("Session", Session),
  verificationToken: repo("VerificationToken", VerificationToken),

  // School config
  schoolSettings: repo("SchoolSettings", SchoolSettings),
  academicSession: repo("AcademicSession", AcademicSession),
  class: repo("Class", Class),
  subject: repo("Subject", Subject),

  // People
  staff: repo("Staff", Staff),
  staffDocument: repo("StaffDocument", StaffDocument),
  staffAttendance: repo("StaffAttendance", StaffAttendance),
  student: repo("Student", Student),
  studentDocument: repo("StudentDocument", StudentDocument),

  // Finance
  feeCategory: repo("FeeCategory", FeeCategory),
  feeStructure: repo("FeeStructure", FeeStructure),
  feePayment: repo("FeePayment", FeePayment),
  expenseCategory: repo("ExpenseCategory", ExpenseCategory),
  expense: repo("Expense", Expense),
  transportAssignment: repo("TransportAssignment", TransportAssignment),

  // Academic
  attendance: repo("Attendance", Attendance),
  exam: repo("Exam", Exam),
  examDateSheet: repo("ExamDateSheet", ExamDateSheet),
  result: repo("Result", Result),
  timetable: repo("Timetable", Timetable),
  homework: repo("Homework", Homework),
  homeworkSubmission: repo("HomeworkSubmission", HomeworkSubmission),
  studyMaterial: repo("StudyMaterial", StudyMaterial),

  // Engagement
  announcement: repo("Announcement", Announcement),
  announcementVisibility: repo("AnnouncementVisibility", AnnouncementVisibility),
  certificate: repo("Certificate", Certificate),
  idCard: repo("IDCard", IDCard),
  notification: repo("Notification", Notification),
  leave: repo("Leave", Leave),
  auditLog: repo("AuditLog", AuditLog),

  /**
   * Prisma's `$transaction` is intentionally NOT reimplemented.
   *
   * MongoDB Atlas free tier (M0) is a single-node deployment with no replica
   * set, so multi-document transactions are unavailable. Emulating them with
   * compensating writes would silently weaken durability guarantees, so this
   * throws instead. The five call sites that used it have been converted to
   * explicit create-then-rollback logic - see the comments there.
   */
  async $transaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    throw new Error(
      "db.$transaction is not supported: this MongoDB cluster is on the free tier " +
        "(single node, no replica set) and cannot run multi-document transactions. " +
        "Use explicit compensating writes instead."
    );
  },

  async $disconnect(): Promise<void> {
    await mongoose.disconnect();
  },

  /** Ensure indexes exist. Run from the seed script. */
  async syncIndexes(): Promise<void> {
    await connectDB();
    const all = mongoose.modelNames();
    for (const name of all) {
      await mongoose.model(name).syncIndexes();
    }
  },
};

export type Db = typeof db;
export { connectDB };
export default db;