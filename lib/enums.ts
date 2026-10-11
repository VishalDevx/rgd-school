/**
 * Enum value lists, ported from the deleted `prisma/schema.prisma`.
 *
 * Prisma's MongoDB connector does not support enums, so MongoDB stores these as
 * plain strings. We keep them as const tuples plus union types so we still get
 * compile-time checking in TypeScript, and export validators for Mongoose.
 *
 * The string values are unchanged from the original Prisma enums, so persisted
 * data and existing comparisons (`role === "ADMIN"`) remain valid.
 */

export const Role = {
  ADMIN: "ADMIN",
  STAFF: "STAFF",
  STUDENT: "STUDENT",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const Gender = {
  MALE: "MALE",
  FEMALE: "FEMALE",
  OTHER: "OTHER",
} as const;
export type Gender = (typeof Gender)[keyof typeof Gender];

export const FeeStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  PARTIAL: "PARTIAL",
} as const;
export type FeeStatus = (typeof FeeStatus)[keyof typeof FeeStatus];

export const AttendanceStatus = {
  PRESENT: "PRESENT",
  ABSENT: "ABSENT",
  LATE: "LATE",
  LEAVE: "LEAVE",
  HALF_DAY: "HALF_DAY",
} as const;
export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

export const TransactionType = {
  CREDIT: "CREDIT",
  DEBIT: "DEBIT",
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export const NotificationType = {
  ANNOUNCEMENT: "ANNOUNCEMENT",
  FEE_REMINDER: "FEE_REMINDER",
  RESULT_PUBLISHED: "RESULT_PUBLISHED",
  ATTENDANCE_ALERT: "ATTENDANCE_ALERT",
  GENERAL: "GENERAL",
  HOMEWORK: "HOMEWORK",
  CERTIFICATE: "CERTIFICATE",
} as const;
export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType];

export const Grade = {
  NURSERY: "NURSERY",
  LKG: "LKG",
  UKG: "UKG",
  ONE: "ONE",
  TWO: "TWO",
  THREE: "THREE",
  FOUR: "FOUR",
  FIVE: "FIVE",
  SIX: "SIX",
  SEVEN: "SEVEN",
  EIGHT: "EIGHT",
  NINE: "NINE",
  TEN: "TEN",
} as const;
export type Grade = (typeof Grade)[keyof typeof Grade];

export const PaymentMethod = {
  CASH: "CASH",
  ONLINE: "ONLINE",
  CARD: "CARD",
  UPI: "UPI",
  BANK: "BANK",
  CHEQUE: "CHEQUE",
} as const;
export type PaymentMethod = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const SubscriptionTier = {
  BASIC: "BASIC",
  PRO: "PRO",
  ENTERPRISE: "ENTERPRISE",
} as const;
export type SubscriptionTier = (typeof SubscriptionTier)[keyof typeof SubscriptionTier];

export const ExamCategory = {
  UNIT_TEST: "UNIT_TEST",
  MONTHLY_TEST: "MONTHLY_TEST",
  HALF_YEARLY: "HALF_YEARLY",
  ANNUAL: "ANNUAL",
  PRE_BOARD: "PRE_BOARD",
  PRACTICAL: "PRACTICAL",
} as const;
export type ExamCategory = (typeof ExamCategory)[keyof typeof ExamCategory];

export const SubjectType = {
  THEORY: "THEORY",
  PRACTICAL: "PRACTICAL",
  BOTH: "BOTH",
} as const;
export type SubjectType = (typeof SubjectType)[keyof typeof SubjectType];

export const SubmissionStatus = {
  PENDING: "PENDING",
  SUBMITTED: "SUBMITTED",
  GRADED: "GRADED",
} as const;
export type SubmissionStatus = (typeof SubmissionStatus)[keyof typeof SubmissionStatus];

export const MaterialType = {
  NOTES: "NOTES",
  PDF: "PDF",
  VIDEO: "VIDEO",
  REFERENCE: "REFERENCE",
  ASSIGNMENT: "ASSIGNMENT",
} as const;
export type MaterialType = (typeof MaterialType)[keyof typeof MaterialType];

export const CertificateType = {
  BONAFIDE: "BONAFIDE",
  CHARACTER: "CHARACTER",
  TRANSFER: "TRANSFER",
  STUDY: "STUDY",
  FEE_CLEARANCE: "FEE_CLEARANCE",
  NO_DUES: "NO_DUES",
  ACHIEVEMENT: "ACHIEVEMENT",
  PARTICIPATION: "PARTICIPATION",
  EXPERIENCE: "EXPERIENCE",
  JOINING_LETTER: "JOINING_LETTER",
} as const;
export type CertificateType = (typeof CertificateType)[keyof typeof CertificateType];

/** Leave request status. Stored as a free-form string in the original schema. */
export const LeaveStatus = {
  PENDING: "PENDING",
  APPROVED: "APPROVED",
  REJECTED: "REJECTED",
} as const;
export type LeaveStatus = (typeof LeaveStatus)[keyof typeof LeaveStatus];

export const GRADE_ORDER: readonly Grade[] = [
  Grade.NURSERY,
  Grade.LKG,
  Grade.UKG,
  Grade.ONE,
  Grade.TWO,
  Grade.THREE,
  Grade.FOUR,
  Grade.FIVE,
  Grade.SIX,
  Grade.SEVEN,
  Grade.EIGHT,
  Grade.NINE,
  Grade.TEN,
];