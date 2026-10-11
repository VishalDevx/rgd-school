import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { AttendanceStatus, ExamCategory, MaterialType, SubmissionStatus } from "@/lib/enums";

const AttendanceSchema = new Schema(
  {
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    date: { type: Date, required: true },
    status: { type: String, required: true, enum: Object.values(AttendanceStatus) },
    markedById: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
  },
  { timestamps: true }
);

// Was `@@unique([studentId, date])` - both fields required, so a plain
// compound unique index is safe. This backs the upsert key `studentId_date`.
AttendanceSchema.index({ studentId: 1, date: 1 }, { unique: true });
AttendanceSchema.index({ classId: 1, date: 1 });
AttendanceSchema.index({ markedById: 1 });

const ExamSchema = new Schema(
  {
    name: { type: String, required: true },
    category: { type: String, required: true, enum: Object.values(ExamCategory) },
    sequence: { type: Number },
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    isLocked: { type: Boolean, default: false },
    description: { type: String },
    instructions: { type: String },
    createdById: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
);

ExamSchema.index({ classId: 1 });
ExamSchema.index({ category: 1 });
// Was `@@unique([classId, category, sequence])`. `sequence` is OPTIONAL, so a
// plain compound unique index would collide on null for every exam that omits
// a sequence number. The partial filter only constrains docs that set one.
ExamSchema.index(
  { classId: 1, category: 1, sequence: 1 },
  {
    unique: true,
    partialFilterExpression: { sequence: { $type: "number" } },
  }
);

const ExamDateSheetSchema = new Schema(
  {
    examId: { type: Schema.Types.ObjectId, ref: "Exam", required: true },
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    examDate: { type: Date, required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    room: { type: String },
  },
  { timestamps: true }
);

ExamDateSheetSchema.index({ examId: 1, subjectId: 1, classId: 1 }, { unique: true });
ExamDateSheetSchema.index({ classId: 1 });
ExamDateSheetSchema.index({ subjectId: 1 });

const ResultSchema = new Schema(
  {
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    examId: { type: Schema.Types.ObjectId, ref: "Exam", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    marks: { type: Number, required: true },
    maxMarks: { type: Number, required: true },
    grade: { type: String },
    rank: { type: Number },
    remarks: { type: String },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

ResultSchema.index({ studentId: 1, examId: 1, subjectId: 1 }, { unique: true });
ResultSchema.index({ studentId: 1 });
ResultSchema.index({ examId: 1 });
ResultSchema.index({ subjectId: 1 });

const TimetableSchema = new Schema(
  {
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "Staff" },
    dayOfWeek: { type: Number, required: true },
    startTime: { type: String, required: true },
    endTime: { type: String, required: true },
    room: { type: String },
  },
  { timestamps: true }
);

TimetableSchema.index({ classId: 1, dayOfWeek: 1 });
TimetableSchema.index({ teacherId: 1 });

const HomeworkSchema = new Schema(
  {
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    title: { type: String, required: true },
    description: { type: String },
    dueDate: { type: Date, required: true },
    attachment: { type: String },
  },
  { timestamps: true }
);

HomeworkSchema.index({ classId: 1 });
HomeworkSchema.index({ teacherId: 1 });

const HomeworkSubmissionSchema = new Schema(
  {
    homeworkId: { type: Schema.Types.ObjectId, ref: "Homework", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student", required: true },
    answerFile: { type: String },
    remarks: { type: String },
    status: { type: String, enum: Object.values(SubmissionStatus), default: SubmissionStatus.PENDING },
    submittedAt: { type: Date, default: Date.now },
    gradedAt: { type: Date },
    teacherRemarks: { type: String },
  },
  { timestamps: true }
);

HomeworkSubmissionSchema.index({ homeworkId: 1, studentId: 1 }, { unique: true });
HomeworkSubmissionSchema.index({ homeworkId: 1 });
HomeworkSubmissionSchema.index({ studentId: 1 });

const StudyMaterialSchema = new Schema(
  {
    classId: { type: Schema.Types.ObjectId, ref: "Class", required: true },
    subjectId: { type: Schema.Types.ObjectId, ref: "Subject", required: true },
    teacherId: { type: Schema.Types.ObjectId, ref: "Staff", required: true },
    title: { type: String, required: true },
    description: { type: String },
    fileUrl: { type: String },
    videoLink: { type: String },
    type: { type: String, required: true, enum: Object.values(MaterialType) },
  },
  { timestamps: true }
);

StudyMaterialSchema.index({ classId: 1, subjectId: 1 });
StudyMaterialSchema.index({ teacherId: 1 });

export const Attendance =
  mongoose.models.Attendance || mongoose.model("Attendance", AttendanceSchema);
export const Exam = mongoose.models.Exam || mongoose.model("Exam", ExamSchema);
export const ExamDateSheet =
  mongoose.models.ExamDateSheet || mongoose.model("ExamDateSheet", ExamDateSheetSchema);
export const Result = mongoose.models.Result || mongoose.model("Result", ResultSchema);
export const Timetable = mongoose.models.Timetable || mongoose.model("Timetable", TimetableSchema);
export const Homework = mongoose.models.Homework || mongoose.model("Homework", HomeworkSchema);
export const HomeworkSubmission =
  mongoose.models.HomeworkSubmission || mongoose.model("HomeworkSubmission", HomeworkSubmissionSchema);
export const StudyMaterial =
  mongoose.models.StudyMaterial || mongoose.model("StudyMaterial", StudyMaterialSchema);

export type AttendanceDoc = InferSchemaType<typeof AttendanceSchema>;
export type ExamDoc = InferSchemaType<typeof ExamSchema>;
export type ExamDateSheetDoc = InferSchemaType<typeof ExamDateSheetSchema>;
export type ResultDoc = InferSchemaType<typeof ResultSchema>;
export type TimetableDoc = InferSchemaType<typeof TimetableSchema>;
export type HomeworkDoc = InferSchemaType<typeof HomeworkSchema>;
export type HomeworkSubmissionDoc = InferSchemaType<typeof HomeworkSubmissionSchema>;
export type StudyMaterialDoc = InferSchemaType<typeof StudyMaterialSchema>;