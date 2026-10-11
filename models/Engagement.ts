import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { CertificateType, NotificationType, Role } from "@/lib/enums";

const AnnouncementSchema = new Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    attachment: { type: String },
    expiryDate: { type: Date },
    isPinned: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

AnnouncementSchema.index({ createdBy: 1 });

const AnnouncementVisibilitySchema = new Schema(
  {
    announcementId: { type: Schema.Types.ObjectId, ref: "Announcement", required: true },
    role: { type: String, required: true, enum: Object.values(Role) },
  },
  { timestamps: true }
);

AnnouncementVisibilitySchema.index({ announcementId: 1, role: 1 }, { unique: true });

const CertificateSchema = new Schema(
  {
    certificateNo: { type: String, required: true, unique: true },
    type: { type: String, required: true, enum: Object.values(CertificateType) },
    studentId: { type: Schema.Types.ObjectId, ref: "Student" },
    staffId: { type: Schema.Types.ObjectId, ref: "Staff" },
    issueDate: { type: Date, default: Date.now },
    content: { type: Schema.Types.Mixed },
    remarks: { type: String },
  },
  { timestamps: true }
);

CertificateSchema.index({ type: 1 });
CertificateSchema.index({ studentId: 1 });
CertificateSchema.index({ staffId: 1 });

const IDCardSchema = new Schema(
  {
    // Every card belongs to EITHER a student OR a staff member, never both.
    // Both fields are optional, so both indexes must be sparse - otherwise the
    // second student card would collide with the first staff card on `null`.
    studentId: { type: Schema.Types.ObjectId, ref: "Student", unique: true, sparse: true },
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", unique: true, sparse: true },
    cardNo: { type: String, required: true, unique: true },
    issueDate: { type: Date, default: Date.now },
    expiryDate: { type: Date },
    qrData: { type: String },
  },
  { timestamps: true }
);

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, required: true, enum: Object.values(NotificationType) },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1 });
NotificationSchema.index({ type: 1 });

const LeaveSchema = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "Staff" },
    studentId: { type: Schema.Types.ObjectId, ref: "Student" },
    fromDate: { type: Date, required: true },
    toDate: { type: Date, required: true },
    reason: { type: String, required: true },
    status: { type: String, default: "PENDING" },
  },
  { timestamps: true }
);

LeaveSchema.index({ staffId: 1 });
LeaveSchema.index({ studentId: 1 });

const AuditLogSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: { type: String },
    oldValue: { type: Schema.Types.Mixed },
    newValue: { type: Schema.Types.Mixed },
    ipAddress: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ entity: 1, entityId: 1 });
AuditLogSchema.index({ createdAt: -1 });

export const Announcement =
  mongoose.models.Announcement || mongoose.model("Announcement", AnnouncementSchema);
export const AnnouncementVisibility =
  mongoose.models.AnnouncementVisibility ||
  mongoose.model("AnnouncementVisibility", AnnouncementVisibilitySchema);
export const Certificate =
  mongoose.models.Certificate || mongoose.model("Certificate", CertificateSchema);
export const IDCard = mongoose.models.IDCard || mongoose.model("IDCard", IDCardSchema);
export const Notification =
  mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);
export const Leave = mongoose.models.Leave || mongoose.model("Leave", LeaveSchema);
export const AuditLog = mongoose.models.AuditLog || mongoose.model("AuditLog", AuditLogSchema);

export type AnnouncementDoc = InferSchemaType<typeof AnnouncementSchema>;
export type AnnouncementVisibilityDoc = InferSchemaType<typeof AnnouncementVisibilitySchema>;
export type CertificateDoc = InferSchemaType<typeof CertificateSchema>;
export type IDCardDoc = InferSchemaType<typeof IDCardSchema>;
export type NotificationDoc = InferSchemaType<typeof NotificationSchema>;
export type LeaveDoc = InferSchemaType<typeof LeaveSchema>;
export type AuditLogDoc = InferSchemaType<typeof AuditLogSchema>;