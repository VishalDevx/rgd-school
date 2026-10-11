import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { Grade, SubscriptionTier } from "@/lib/enums";

const SchoolSettingsSchema = new Schema(
  {
    name: { type: String, required: true },
    address: { type: String },
    contactEmail: { type: String },
    contactPhone: { type: String },
    academicYear: { type: String },
    logoUrl: { type: String },
    faviconUrl: { type: String },
    // Prisma Json -> Mixed. Cannot be used in `where` filters on MongoDB.
    featureFlags: { type: Schema.Types.Mixed },
    galleryImages: { type: Schema.Types.Mixed },
    heroImages: { type: Schema.Types.Mixed },
    primaryColor: { type: String },
    tier: { type: String, enum: Object.values(SubscriptionTier), default: SubscriptionTier.BASIC },
    principalName: { type: String },
    registrationNo: { type: String },
    udiseCode: { type: String },
    receiptPrefix: { type: String },
    admissionPrefix: { type: String },
    staffIdPrefix: { type: String },
    gradingSystem: { type: String },
    dateFormat: { type: String },
    currency: { type: String },
    website: { type: String },
    pdfHeader: { type: String },
    pdfFooter: { type: String },
  },
  { timestamps: true }
);

const AcademicSessionSchema = new Schema(
  {
    name: { type: String, required: true },
    isActive: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AcademicSessionSchema.index({ isActive: 1, createdAt: -1 });

const ClassSchema = new Schema(
  {
    name: { type: String, required: true },
    grade: { type: String, required: true, enum: Object.values(Grade) },
    section: { type: String },
    gradeCode: { type: String },
    teacherId: { type: Schema.Types.ObjectId, ref: "Staff" },
    academicSessionId: { type: Schema.Types.ObjectId, ref: "AcademicSession", required: true },
  },
  { timestamps: true }
);

ClassSchema.index({ teacherId: 1 });
ClassSchema.index({ grade: 1, section: 1 });

const SubjectSchema = new Schema(
  {
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    classId: { type: Schema.Types.ObjectId, ref: "Class" },
    teacherId: { type: Schema.Types.ObjectId, ref: "Staff" },
    maxMarks: { type: Number },
    passingMarks: { type: Number },
    type: { type: String, enum: ["THEORY", "PRACTICAL", "BOTH"] },
  },
  { timestamps: true }
);

SubjectSchema.index({ classId: 1 });
SubjectSchema.index({ teacherId: 1 });

export const SchoolSettings =
  mongoose.models.SchoolSettings || mongoose.model("SchoolSettings", SchoolSettingsSchema);
export const AcademicSession =
  mongoose.models.AcademicSession || mongoose.model("AcademicSession", AcademicSessionSchema);
export const Class = mongoose.models.Class || mongoose.model("Class", ClassSchema);
export const Subject = mongoose.models.Subject || mongoose.model("Subject", SubjectSchema);

export type SchoolSettingsDoc = InferSchemaType<typeof SchoolSettingsSchema>;
export type AcademicSessionDoc = InferSchemaType<typeof AcademicSessionSchema>;
export type ClassDoc = InferSchemaType<typeof ClassSchema>;
export type SubjectDoc = InferSchemaType<typeof SubjectSchema>;