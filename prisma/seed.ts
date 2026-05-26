import {
  PrismaClient,
  Role,
  Grade,
  ExamCategory,
  AttendanceStatus,
  TransactionType,
  NotificationType,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Resetting database...");

  // ================= DELETE (CHILD → PARENT) =================
  await db.result.deleteMany();
  await db.examDateSheet.deleteMany();
  await db.exam.deleteMany();
  await db.attendance.deleteMany();
  await db.feePayment.deleteMany();
  await db.feeStructure.deleteMany();
  await db.subject.deleteMany();
  await db.student.deleteMany();
  await db.leave.deleteMany();
  await db.staff.deleteMany();
  await db.expense.deleteMany();
  await db.notification.deleteMany();
  await db.announcementVisibility.deleteMany();
  await db.announcement.deleteMany();
  await db.auditLog.deleteMany();
  await db.account.deleteMany();
  await db.session.deleteMany();
  await db.verificationToken.deleteMany();
  await db.class.deleteMany();
  await db.academicSession.deleteMany();
  await db.schoolSettings.deleteMany();
  await db.user.deleteMany();

  // ================= SCHOOL SETTINGS =================
  await db.schoolSettings.create({
    data: {
      name: "RGD Public School",
      academicYear: "2024-2025",
      tier: "BASIC",
      primaryColor: "#2563eb",
    },
  });

  // ================= ACADEMIC SESSION =================
  const session = await db.academicSession.create({
    data: {
      name: "2024-2025",
      isActive: true,
    },
  });

  // ================= PASSWORDS =================
  const adminPass = await bcrypt.hash("Admin@123", 10);
  const staffPass = await bcrypt.hash("Staff@123", 10);
  const studentPass = await bcrypt.hash("Student@123", 10);

  // ================= USERS =================
  const admin = await db.user.create({
    data: {
      name: "Principal Admin",
      email: "admin@school.com",
      passwordHash: adminPass,
      role: Role.ADMIN,
      adharNo: "999988887777",
    },
  });

  const staffUser = await db.user.create({
    data: {
      name: "Amit Teacher",
      email: "staff@school.com",
      passwordHash: staffPass,
      role: Role.STAFF,
      adharNo: "888877776666",
    },
  });

  const studentUser = await db.user.create({
    data: {
      name: "Ravi Student",
      email: "student@school.com",
      passwordHash: studentPass,
      role: Role.STUDENT,
      adharNo: "123456789012",
    },
  });

  // ================= STAFF =================
  const staff = await db.staff.create({
    data: {
      userId: staffUser.id,
      designation: "Math Teacher",
      salary: 32000,
    },
  });

  // ================= CLASS =================
  const class9A = await db.class.create({
    data: {
      name: "Class 9 A",
      grade: Grade.NINE,
      section: "A",
      academicSessionId: session.id,
      teacherId: staff.id,
    },
  });

  // ================= STUDENT =================
  const student = await db.student.create({
    data: {
      userId: studentUser.id,
      admissionNo: "ADM-0001",
      rollNumber: "01",
      classId: class9A.id,
      dob: new Date("2008-05-10"),
      religion: "Hindu",
      caste: "SC",
    },
  });

  // ================= SUBJECTS =================
  const math = await db.subject.create({
    data: {
      name: "Mathematics",
      code: "MATH-9",
      classId: class9A.id,
      teacherId: staff.id,
    },
  });

  const science = await db.subject.create({
    data: {
      name: "Science",
      code: "SCI-9",
      classId: class9A.id,
      teacherId: staff.id,
    },
  });

  // ================= ATTENDANCE =================
  await db.attendance.createMany({
    data: [
      {
        classId: class9A.id,
        studentId: student.id,
        markedById: staff.id,
        date: new Date(),
        status: AttendanceStatus.PRESENT,
      },
    ],
  });

  // ================= FEE =================
  const fee = await db.feeStructure.create({
    data: {
      classId: class9A.id,
      name: "Annual Fee",
      examFee: "0",
      miscFee: "0",
      total: "0",
      monthlyFee: "450",
      totalMonths: 12,
    },
  });

  await db.feePayment.create({
    data: {
      studentId: student.id,
      feeStructureId: fee.id,
      amountPaid: "0",
      remainAmount: "5400",
      status: "PENDING",
    },
  });

  // ================= EXAM =================
  const exam = await db.exam.create({
    data: {
      name: "Half Yearly",
      category: ExamCategory.HALF_YEARLY,
      classId: class9A.id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 5 * 86400000),
      createdById: staffUser.id,
    },
  });

  // ================= DATE SHEET =================
  await db.examDateSheet.createMany({
    data: [
      {
        examId: exam.id,
        classId: class9A.id,
        subjectId: math.id,
        examDate: new Date(),
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 3600000),
        room: "101",
      },
      {
        examId: exam.id,
        classId: class9A.id,
        subjectId: science.id,
        examDate: new Date(),
        startTime: new Date(),
        endTime: new Date(Date.now() + 2 * 3600000),
        room: "102",
      },
    ],
  });

  // ================= RESULTS =================
  await db.result.createMany({
    data: [
      {
        studentId: student.id,
        examId: exam.id,
        subjectId: math.id,
        marks: 78,
        maxMarks: 100,
        grade: "B+",
        uploadedBy: staffUser.id,
      },
      {
        studentId: student.id,
        examId: exam.id,
        subjectId: science.id,
        marks: 85,
        maxMarks: 100,
        grade: "A",
        uploadedBy: staffUser.id,
      },
    ],
  });

  // ================= ANNOUNCEMENT =================
  const announcement = await db.announcement.create({
    data: {
      title: "Half Yearly Exams",
      content: "Half yearly exams will start from Monday.",
      createdBy: admin.id,
    },
  });

  await db.announcementVisibility.createMany({
    data: [
      { announcementId: announcement.id, role: Role.STUDENT },
      { announcementId: announcement.id, role: Role.STAFF },
    ],
  });

  // ================= NOTIFICATION =================
  await db.notification.create({
    data: {
      userId: studentUser.id,
      type: NotificationType.RESULT_PUBLISHED,
      title: "Results Published",
      message: "Your Half Yearly results are available.",
    },
  });

  // ================= LEAVE =================
  await db.leave.create({
    data: {
      staffId: staff.id,
      fromDate: new Date(),
      toDate: new Date(Date.now() + 2 * 86400000),
      reason: "Medical",
    },
  });

  // ================= EXPENSE =================
  await db.expense.create({
    data: {
      title: "Electricity Bill",
      amount: "8500",
      createdById: admin.id,
      transaction: TransactionType.DEBIT,
    },
  });

  // ================= AUDIT LOG =================
  await db.auditLog.create({
    data: {
      userId: admin.id,
      action: "CREATE",
      entity: "EXAM",
      entityId: exam.id,
      newValue: { exam: "Half Yearly" },
    },
  });

  console.log("✅ FULL DATABASE SEEDED (NO TABLE LEFT)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
