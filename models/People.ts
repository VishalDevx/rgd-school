import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { AttendanceStatus, Gender } from "@/lib/enums";

const StaffSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    staffId: { type: String, sparse: true },
    designation: { type: String, required: true },
    department: { type: String },
    qualification: { type: String },
    experience: { type: String },
    salary: { type: Number },
    joinDate: { type: Date, default: Date.now },
    active: { type: Boolean, default: true },
    profileImg: { type: String },
    gender: { type: String, enum: Object.values(Gender) },
    dob: { type: Date },
    address: { type: String },
    phone: { type: String },
  },
  { timestamps: true }
);

StaffSchema.index({ designation: 1 });
// `staffId` already gets an index from the `sparse: true` path option above.

const StaffDocumentSchema = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    fileUrl: { type: String, required: true },
  },
  { timestamps: true }
);

StaffDocumentSchema.index({ staffId: 1 });

const StaffAttendanceSchema = new Schema(
  {
    staffId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    date: { type: Date, required: true },
    status: { type: String, required: true, enum: Object.values(AttendanceStatus) },
  },
  { timestamps: true }
);

// Was `@@unique([staffId, date])` in Prisma. date is required, so a plain
// compound unique index is safe (no null-collision problem).
StaffAttendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });

const StudentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    admissionNo: { type: String, required: true, unique: true },
    rollNumber: { type: String, required: true },
    admissionDate: { type: Date, default: Date.now },
    dob: { type: Date },
    gender: { type: String, enum: Object.values(Gender) },
    bloodGroup: { type: String },
    address: { type: String },
    permanentAddress: { type: String },
    classId: { type: Schema.Types.ObjectId, ref: "Class" },
    active: { type: Boolean, default: true },
    profileImg: { type: String },
    fatherName: { type: String },
    fatherPhone: { type: String },
    fatherOccupation: { type: String },
    motherName: { type: String },
    motherPhone: { type: String },
    motherOccupation: { type: String },
    guardianName: { type: String },
    guardianPhone: { type: String },
    occupation: { type: String, default: "" },
    religion: { type: String, default: "" },
    caste: { type: String, default: "" },
    category: { type: String },
    contactNo: { type: String },
    panNo: { type: String },
    apaarId: { type: String },
    fatherAadhar: { type: String },
    motherAadhar: { type: String },
    previousSchool: { type: String },
    remarks: { type: String },
    usesTransport: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Was `@@unique([classId, rollNumber])`. classId is OPTIONAL, so a normal
// compound unique index would collide on null for every unassigned student.
// The partial filter excludes documents without a classId.
StudentSchema.index(
  { classId: 1, rollNumber: 1 },
  {
    unique: true,
    partialFilterExpression: { classId: { $type: "objectId" } },
  }
);
StudentSchema.index({ classId: 1 });
StudentSchema.index({ active: 1 });

const StudentDocumentSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    type: { type: String, required: true },
    title: { type: String, required: true },
    fileUrl: { type: String, required: true },
  },
  { timestamps: true }
);

StudentDocumentSchema.index({ studentId: 1 });

export const Staff = mongoose.models.Staff || mongoose.model("Staff", StaffSchema);
export const StaffDocument =
  mongoose.models.StaffDocument || mongoose.model("StaffDocument", StaffDocumentSchema);
export const StaffAttendance =
  mongoose.models.StaffAttendance || mongoose.model("StaffAttendance", StaffAttendanceSchema);
export const Student = mongoose.models.Student || mongoose.model("Student", StudentSchema);
export const StudentDocument =
  mongoose.models.StudentDocument || mongoose.model("StudentDocument", StudentDocumentSchema);

export type StaffDoc = InferSchemaType<typeof StaffSchema>;
export type StaffDocumentDoc = InferSchemaType<typeof StaffDocumentSchema>;
export type StaffAttendanceDoc = InferSchemaType<typeof StaffAttendanceSchema>;
export type StudentDoc = InferSchemaType<typeof StudentSchema>;
export type StudentDocumentDoc = InferSchemaType<typeof StudentDocumentSchema>;