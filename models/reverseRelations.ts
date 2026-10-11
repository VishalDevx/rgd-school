/**
 * Reverse ("one-to-many") relation declarations.
 *
 * Mongoose schemas store the foreign key on the child document only, so a
 * parent model has no declared path for its children. Prisma exposed both
 * directions, and route code relies on the reverse side - e.g.
 * `include: { students: true }` and `_count: { select: { students: true } }`
 * on `Class`.
 *
 * Each entry declares a virtual on the PARENT:
 *   name        - populate path / Prisma relation name
 *   model       - child model name
 *   foreignField- the FK field on the child that points back at the parent
 *   one         - true for to-one (e.g. `Student.transport`)
 */

export type ReverseRelation = {
  name: string;
  model: string;
  foreignField: string;
  one?: boolean;
};

export const REVERSE_RELATIONS: Record<string, ReverseRelation[]> = {
  User: [
    { name: "accounts", model: "Account", foreignField: "userId" },
    { name: "sessions", model: "Session", foreignField: "userId" },
    { name: "announcements", model: "Announcement", foreignField: "createdBy" },
    { name: "auditLogs", model: "AuditLog", foreignField: "userId" },
    { name: "expenses", model: "Expense", foreignField: "createdById" },
    { name: "notifications", model: "Notification", foreignField: "userId" },
    { name: "exams", model: "Exam", foreignField: "createdById" },
    { name: "results", model: "Result", foreignField: "uploadedBy" },
    { name: "staff", model: "Staff", foreignField: "userId", one: true },
    { name: "student", model: "Student", foreignField: "userId", one: true },
  ],

  AcademicSession: [
    { name: "classes", model: "Class", foreignField: "academicSessionId" },
  ],

  Class: [
    { name: "attendances", model: "Attendance", foreignField: "classId" },
    { name: "exams", model: "Exam", foreignField: "classId" },
    { name: "feeStructures", model: "FeeStructure", foreignField: "classId" },
    { name: "students", model: "Student", foreignField: "classId" },
    { name: "subjects", model: "Subject", foreignField: "classId" },
    { name: "dateSheet", model: "ExamDateSheet", foreignField: "classId" },
    { name: "homeworks", model: "Homework", foreignField: "classId" },
    { name: "studyMaterials", model: "StudyMaterial", foreignField: "classId" },
    { name: "timetables", model: "Timetable", foreignField: "classId" },
  ],

  Subject: [
    { name: "results", model: "Result", foreignField: "subjectId" },
    { name: "dateSheet", model: "ExamDateSheet", foreignField: "subjectId" },
    { name: "homeworks", model: "Homework", foreignField: "subjectId" },
    { name: "studyMaterials", model: "StudyMaterial", foreignField: "subjectId" },
    { name: "timetables", model: "Timetable", foreignField: "subjectId" },
  ],

  Staff: [
    { name: "attendance", model: "Attendance", foreignField: "markedById" },
    { name: "classes", model: "Class", foreignField: "teacherId" },
    { name: "leaves", model: "Leave", foreignField: "staffId" },
    { name: "subjects", model: "Subject", foreignField: "teacherId" },
    { name: "staffAttendance", model: "StaffAttendance", foreignField: "staffId" },
    { name: "documents", model: "StaffDocument", foreignField: "staffId" },
    { name: "homework", model: "Homework", foreignField: "teacherId" },
    { name: "studyMaterials", model: "StudyMaterial", foreignField: "teacherId" },
    { name: "timetables", model: "Timetable", foreignField: "teacherId" },
    { name: "certificates", model: "Certificate", foreignField: "staffId" },
    { name: "idCards", model: "IDCard", foreignField: "staffId" },
  ],

  Student: [
    { name: "attendance", model: "Attendance", foreignField: "studentId" },
    { name: "fees", model: "FeePayment", foreignField: "studentId" },
    { name: "results", model: "Result", foreignField: "studentId" },
    { name: "transport", model: "TransportAssignment", foreignField: "studentId", one: true },
    { name: "leaves", model: "Leave", foreignField: "studentId" },
    { name: "documents", model: "StudentDocument", foreignField: "studentId" },
    { name: "homeworkSubmissions", model: "HomeworkSubmission", foreignField: "studentId" },
    { name: "certificates", model: "Certificate", foreignField: "studentId" },
    { name: "idCards", model: "IDCard", foreignField: "studentId" },
  ],

  FeeCategory: [
    { name: "structures", model: "FeeStructure", foreignField: "categoryId" },
  ],

  FeeStructure: [
    { name: "payments", model: "FeePayment", foreignField: "feeStructureId" },
  ],

  ExpenseCategory: [
    { name: "expenses", model: "Expense", foreignField: "categoryId" },
  ],

  Exam: [
    { name: "results", model: "Result", foreignField: "examId" },
    { name: "dateSheet", model: "ExamDateSheet", foreignField: "examId" },
  ],

  Homework: [
    { name: "submissions", model: "HomeworkSubmission", foreignField: "homeworkId" },
  ],

  Announcement: [
    { name: "visibleRoles", model: "AnnouncementVisibility", foreignField: "announcementId" },
  ],
};