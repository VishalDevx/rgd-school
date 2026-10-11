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
    amount: { type: Number, default: 0 },
    examFee: { type: Number },
    transportFee: { type: Number },
    miscFee: { type: Number },
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

const FeePaymentSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    feeStructureId: { type: Schema.Types.ObjectId, ref: "FeeStructure", required: true },
    amountPaid: { type: Number, required: true },
    remainAmount: { type: Number, required: true },
    status: { type: String, enum: Object.values(FeeStatus), default: FeeStatus.PENDING },
    paymentDate: { type: Date },
    paymentMode: { type: String, enum: Object.values(PaymentMethod) },
    discount: { type: Number },
    lateFine: { type: Number },
    receiptNo: { type: String },
    remarks: { type: String },
    // Sparse: cash payments have no razorpay order id. Without `sparse`, the
    // second cash payment would collide against a shared null.
    razorpayOrder: { type: String, unique: true, sparse: true },
    razorpayPaymentId: { type: String },
    receiptUrl: { type: String },
  },
  { timestamps: true }
);

FeePaymentSchema.index({ studentId: 1 });
FeePaymentSchema.index({ feeStructureId: 1 });
FeePaymentSchema.index({ receiptNo: 1 });

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
export const ExpenseCategory =
  mongoose.models.ExpenseCategory || mongoose.model("ExpenseCategory", ExpenseCategorySchema);
export const Expense = mongoose.models.Expense || mongoose.model("Expense", ExpenseSchema);
export const TransportAssignment =
  mongoose.models.TransportAssignment ||
  mongoose.model("TransportAssignment", TransportAssignmentSchema);

export type FeeCategoryDoc = InferSchemaType<typeof FeeCategorySchema>;
export type FeeStructureDoc = InferSchemaType<typeof FeeStructureSchema>;
export type FeePaymentDoc = InferSchemaType<typeof FeePaymentSchema>;
export type ExpenseCategoryDoc = InferSchemaType<typeof ExpenseCategorySchema>;
export type ExpenseDoc = InferSchemaType<typeof ExpenseSchema>;
export type TransportAssignmentDoc = InferSchemaType<typeof TransportAssignmentSchema>;