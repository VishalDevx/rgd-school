import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { FeeStatus, PaymentMethod, TransactionType } from "@/lib/enums";

/**
 * All monetary fields are stored as `Double` and rounded to 2dp via
 * `lib/money.ts`. See the note there on why Decimal128 was not used.
 */

const FeeCategorySchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
  },
  { timestamps: true }
);

FeeCategorySchema.index({ name: 1 });

const FeeStructureSchema = new Schema(
  {
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: "FeeCategory" },
    name: { type: String },
    /** Unused legacy field, kept so old documents still validate. */
    amount: { type: Number, default: 0 },
    examFee: { type: Number },
    transportFee: { type: Number },
    miscFee: { type: Number },
    /**
     * Gross total for a student who uses transport:
     * tuition (monthlyFee x totalMonths) + exam + misc + transport.
     * See `lib/fees/calc.ts#structureTotal`.
     */
    total: { type: Number, default: 0 },
    monthlyFee: { type: Number },
    totalMonths: { type: Number, default: 12 },
    isOptional: { type: Boolean, default: false },
    dueDate: { type: Date },
  },
  { timestamps: true }
);

FeeStructureSchema.index({ classId: 1 });
FeeStructureSchema.index({ categoryId: 1 });

/**
 * A student's fee ACCOUNT for one fee structure (one row per student per
 * structure). It is a running balance derived from that account's
 * `FeeTransaction`s; never write `amountPaid`/`remainAmount`/`status` directly,
 * go through `lib/fees/service.ts`, which recomputes them.
 *
 * The collection keeps its historical name (`FeePayment`) so the dashboards and
 * reports that read balances keep working.
 */
const FeePaymentSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    feeStructureId: { type: Schema.Types.ObjectId, ref: "FeeStructure", required: true },
    /** Snapshot: whether this account is charged the structure's transport fee. */
    includesTransport: { type: Boolean },
    /** What the student owes before concessions and fines. */
    totalDue: { type: Number },
    /** Sum of non-voided transaction amounts. */
    amountPaid: { type: Number, required: true, default: 0 },
    /** max(totalDue - discount + lateFine - amountPaid, 0) */
    remainAmount: { type: Number, required: true, default: 0 },
    status: { type: String, enum: Object.values(FeeStatus), default: FeeStatus.PENDING },
    /** Sum of non-voided transaction discounts (concessions). */
    discount: { type: Number, default: 0 },
    /** Sum of non-voided transaction late fines. */
    lateFine: { type: Number, default: 0 },
    // Denormalised from the latest transaction, for list views.
    paymentDate: { type: Date },
    paymentMode: { type: String, enum: Object.values(PaymentMethod) },
    receiptNo: { type: String },
    remarks: { type: String },
    // Sparse: cash payments have no razorpay order id. Without `sparse`, the
    // second cash payment would collide against a shared null.
    razorpayOrder: { type: String, unique: true, sparse: true },
    razorpayPaymentId: { type: String },
    receiptUrl: { type: String },
    /**
     * Pre-ledger accounts stored only a running `amountPaid`. The first time
     * the service touches such an account it writes that amount as one legacy
     * transaction, then sets this flag. See `migrateLegacyAccounts`.
     */
    legacyMigrated: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// One account per student per structure. `script/migrate-fees.ts` merges any
// duplicates left by the old code before this index can build.
FeePaymentSchema.index({ studentId: 1, feeStructureId: 1 }, { unique: true });
FeePaymentSchema.index({ feeStructureId: 1 });
FeePaymentSchema.index({ status: 1 });

/**
 * One money movement against a fee account: a receipt. Immutable once written;
 * mistakes are corrected by voiding (which keeps the audit trail) and
 * recording a new one.
 */
const FeeTransactionSchema = new Schema(
  {
    feePaymentId: { type: Schema.Types.ObjectId, ref: "FeePayment", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    feeStructureId: { type: Schema.Types.ObjectId, ref: "FeeStructure", required: true },
    receiptNo: { type: String, required: true, unique: true },
    amount: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    lateFine: { type: Number, default: 0, min: 0 },
    paymentMode: { type: String, enum: Object.values(PaymentMethod), default: PaymentMethod.CASH },
    paymentDate: { type: Date, required: true },
    referenceNo: { type: String },
    remarks: { type: String },
    collectedById: { type: Schema.Types.ObjectId, ref: "User" },
    /** Set by the lazy migration of pre-ledger balances. */
    isLegacy: { type: Boolean, default: false },
    voided: { type: Boolean, default: false },
    voidReason: { type: String },
    voidedAt: { type: Date },
    voidedById: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

FeeTransactionSchema.index({ feePaymentId: 1 });
FeeTransactionSchema.index({ studentId: 1, paymentDate: -1 });
FeeTransactionSchema.index({ feeStructureId: 1 });
FeeTransactionSchema.index({ paymentDate: -1 });

/** Named atomic sequences (receipt numbers). `_id` is the sequence name. */
const CounterSchema = new Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const ExpenseCategorySchema = new Schema(
  {
    name: { type: String, required: true },
    description: { type: String },
  },
  { timestamps: true }
);

ExpenseCategorySchema.index({ name: 1 });

const ExpenseSchema = new Schema(
  {
    title: { type: String, required: true },
    description: { type: String },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    categoryId: { type: Schema.Types.ObjectId, ref: "ExpenseCategory" },
    paidTo: { type: String },
    paymentMode: { type: String, enum: Object.values(PaymentMethod) },
    billUrl: { type: String },
    createdById: { type: Schema.Types.ObjectId, ref: "User", required: true },
    transaction: { type: String, required: true, enum: Object.values(TransactionType) },
  },
  { timestamps: true }
);

ExpenseSchema.index({ createdById: 1 });
ExpenseSchema.index({ categoryId: 1 });
ExpenseSchema.index({ date: 1 });

const TransportAssignmentSchema = new Schema(
  {
    // Was @unique on an optional-style 1:1 in Prisma; kept unique here.
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true, unique: true },
    routeName: { type: String },
    stopName: { type: String },
    busNumber: { type: String },
    driverName: { type: String },
    driverPhone: { type: String },
    feeAmount: { type: Number },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

TransportAssignmentSchema.index({ isActive: 1 });

export const FeeCategory =
  mongoose.models.FeeCategory || mongoose.model("FeeCategory", FeeCategorySchema);
export const FeeStructure =
  mongoose.models.FeeStructure || mongoose.model("FeeStructure", FeeStructureSchema);
export const FeePayment =
  mongoose.models.FeePayment || mongoose.model("FeePayment", FeePaymentSchema);
export const FeeTransaction =
  mongoose.models.FeeTransaction || mongoose.model("FeeTransaction", FeeTransactionSchema);
export const Counter = mongoose.models.Counter || mongoose.model("Counter", CounterSchema);
export const ExpenseCategory =
  mongoose.models.ExpenseCategory || mongoose.model("ExpenseCategory", ExpenseCategorySchema);
export const Expense = mongoose.models.Expense || mongoose.model("Expense", ExpenseSchema);
export const TransportAssignment =
  mongoose.models.TransportAssignment ||
  mongoose.model("TransportAssignment", TransportAssignmentSchema);

export type FeeCategoryDoc = InferSchemaType<typeof FeeCategorySchema>;
export type FeeStructureDoc = InferSchemaType<typeof FeeStructureSchema>;
export type FeePaymentDoc = InferSchemaType<typeof FeePaymentSchema>;
export type FeeTransactionDoc = InferSchemaType<typeof FeeTransactionSchema>;
export type ExpenseCategoryDoc = InferSchemaType<typeof ExpenseCategorySchema>;
export type ExpenseDoc = InferSchemaType<typeof ExpenseSchema>;
export type TransportAssignmentDoc = InferSchemaType<typeof TransportAssignmentSchema>;