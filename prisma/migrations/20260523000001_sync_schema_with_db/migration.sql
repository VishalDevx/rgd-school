-- Sync database schema with Prisma schema
-- This migration adds all missing tables, columns, enums, indexes, and foreign keys

-- ============================================================
-- ENUMS
-- ============================================================

-- Add missing enum types
CREATE TYPE "SubjectType" AS ENUM ('THEORY', 'PRACTICAL', 'BOTH');

CREATE TYPE "SubmissionStatus" AS ENUM ('PENDING', 'SUBMITTED', 'GRADED');

CREATE TYPE "MaterialType" AS ENUM ('NOTES', 'PDF', 'VIDEO', 'REFERENCE', 'ASSIGNMENT');

CREATE TYPE "CertificateType" AS ENUM ('BONAFIDE', 'CHARACTER', 'TRANSFER', 'STUDY', 'FEE_CLEARANCE', 'NO_DUES', 'ACHIEVEMENT', 'PARTICIPATION', 'EXPERIENCE', 'JOINING_LETTER');

-- Add missing values to existing enums
ALTER TYPE "AttendanceStatus" ADD VALUE IF NOT EXISTS 'HALF_DAY';

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'HOMEWORK';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'CERTIFICATE';

ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'BANK';
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'CHEQUE';

ALTER TYPE "ExamCategory" ADD VALUE IF NOT EXISTS 'MONTHLY_TEST';
ALTER TYPE "ExamCategory" ADD VALUE IF NOT EXISTS 'PRE_BOARD';
ALTER TYPE "ExamCategory" ADD VALUE IF NOT EXISTS 'PRACTICAL';

-- ============================================================
-- MISSING COLUMNS ON EXISTING TABLES
-- ============================================================

-- User: add lastLogin, isActive
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLogin" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Announcement: add attachment, expiryDate, isPinned
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "attachment" TEXT;
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "expiryDate" TIMESTAMP(3);
ALTER TABLE "Announcement" ADD COLUMN IF NOT EXISTS "isPinned" BOOLEAN NOT NULL DEFAULT false;

-- AuditLog: add ipAddress
ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "ipAddress" TEXT;
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- Exam: add description, instructions
ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Exam" ADD COLUMN IF NOT EXISTS "instructions" TEXT;

-- Expense: add categoryId, paidTo, paymentMode, billUrl
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "paidTo" TEXT;
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "paymentMode" "PaymentMethod";
ALTER TABLE "Expense" ADD COLUMN IF NOT EXISTS "billUrl" TEXT;
CREATE INDEX IF NOT EXISTS "Expense_categoryId_idx" ON "Expense"("categoryId");
CREATE INDEX IF NOT EXISTS "Expense_date_idx" ON "Expense"("date");

-- FeePayment: add paymentMode, discount, lateFine, receiptNo, remarks
ALTER TABLE "FeePayment" ADD COLUMN IF NOT EXISTS "paymentMode" "PaymentMethod";
ALTER TABLE "FeePayment" ADD COLUMN IF NOT EXISTS "discount" DECIMAL(12,2);
ALTER TABLE "FeePayment" ADD COLUMN IF NOT EXISTS "lateFine" DECIMAL(12,2);
ALTER TABLE "FeePayment" ADD COLUMN IF NOT EXISTS "receiptNo" TEXT;
ALTER TABLE "FeePayment" ADD COLUMN IF NOT EXISTS "remarks" TEXT;
CREATE INDEX IF NOT EXISTS "FeePayment_receiptNo_idx" ON "FeePayment"("receiptNo");

-- FeeStructure: add categoryId, amount, isOptional, dueDate
ALTER TABLE "FeeStructure" ADD COLUMN IF NOT EXISTS "categoryId" TEXT;
ALTER TABLE "FeeStructure" ADD COLUMN IF NOT EXISTS "amount" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "FeeStructure" ADD COLUMN IF NOT EXISTS "isOptional" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FeeStructure" ADD COLUMN IF NOT EXISTS "dueDate" TIMESTAMP(3);
CREATE INDEX IF NOT EXISTS "FeeStructure_categoryId_idx" ON "FeeStructure"("categoryId");

-- Result: add rank
ALTER TABLE "Result" ADD COLUMN IF NOT EXISTS "rank" INTEGER;

-- Staff: add staffId, department, qualification, experience, profileImg, gender, dob, address, phone
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "staffId" TEXT;
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "qualification" TEXT;
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "experience" TEXT;
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "profileImg" TEXT;
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "gender" "Gender";
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "dob" TIMESTAMP(3);
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "Staff" ADD COLUMN IF NOT EXISTS "phone" TEXT;
CREATE INDEX IF NOT EXISTS "Staff_staffId_idx" ON "Staff"("staffId");

-- Student: add bloodGroup, permanentAddress, fatherPhone, fatherOccupation, motherPhone, motherOccupation, guardianName, guardianPhone, category, previousSchool, remarks
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "bloodGroup" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "permanentAddress" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "fatherPhone" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "fatherOccupation" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "motherPhone" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "motherOccupation" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "guardianName" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "guardianPhone" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "category" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "previousSchool" TEXT;
ALTER TABLE "Student" ADD COLUMN IF NOT EXISTS "remarks" TEXT;

-- Subject: add maxMarks, passingMarks, type
ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "maxMarks" DOUBLE PRECISION;
ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "passingMarks" DOUBLE PRECISION;
ALTER TABLE "Subject" ADD COLUMN IF NOT EXISTS "type" "SubjectType";

-- ============================================================
-- NEW TABLES - FeeCategory
-- ============================================================
CREATE TABLE IF NOT EXISTS "FeeCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeeCategory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "FeeCategory_name_idx" ON "FeeCategory"("name");

-- ============================================================
-- NEW TABLES - ExpenseCategory
-- ============================================================
CREATE TABLE IF NOT EXISTS "ExpenseCategory" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExpenseCategory_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "ExpenseCategory_name_idx" ON "ExpenseCategory"("name");

-- ============================================================
-- NEW TABLES - StaffDocument
-- ============================================================
CREATE TABLE IF NOT EXISTS "StaffDocument" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StaffDocument_staffId_idx" ON "StaffDocument"("staffId");

-- ============================================================
-- NEW TABLES - StaffAttendance
-- ============================================================
CREATE TABLE IF NOT EXISTS "StaffAttendance" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffAttendance_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "StaffAttendance_staffId_date_key" ON "StaffAttendance"("staffId", "date");
CREATE INDEX IF NOT EXISTS "StaffAttendance_staffId_date_idx" ON "StaffAttendance"("staffId", "date");

-- ============================================================
-- NEW TABLES - StudentDocument
-- ============================================================
CREATE TABLE IF NOT EXISTS "StudentDocument" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentDocument_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StudentDocument_studentId_idx" ON "StudentDocument"("studentId");

-- ============================================================
-- NEW TABLES - Timetable
-- ============================================================
CREATE TABLE IF NOT EXISTS "Timetable" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "room" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Timetable_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Timetable_classId_dayOfWeek_idx" ON "Timetable"("classId", "dayOfWeek");
CREATE INDEX IF NOT EXISTS "Timetable_teacherId_idx" ON "Timetable"("teacherId");

-- ============================================================
-- NEW TABLES - Homework
-- ============================================================
CREATE TABLE IF NOT EXISTS "Homework" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "attachment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Homework_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Homework_classId_idx" ON "Homework"("classId");
CREATE INDEX IF NOT EXISTS "Homework_teacherId_idx" ON "Homework"("teacherId");

-- ============================================================
-- NEW TABLES - HomeworkSubmission
-- ============================================================
CREATE TABLE IF NOT EXISTS "HomeworkSubmission" (
    "id" TEXT NOT NULL,
    "homeworkId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "answerFile" TEXT,
    "remarks" TEXT,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "gradedAt" TIMESTAMP(3),
    "teacherRemarks" TEXT,

    CONSTRAINT "HomeworkSubmission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "HomeworkSubmission_homeworkId_studentId_key" ON "HomeworkSubmission"("homeworkId", "studentId");
CREATE INDEX IF NOT EXISTS "HomeworkSubmission_homeworkId_idx" ON "HomeworkSubmission"("homeworkId");
CREATE INDEX IF NOT EXISTS "HomeworkSubmission_studentId_idx" ON "HomeworkSubmission"("studentId");

-- ============================================================
-- NEW TABLES - StudyMaterial
-- ============================================================
CREATE TABLE IF NOT EXISTS "StudyMaterial" (
    "id" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT,
    "videoLink" TEXT,
    "type" "MaterialType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudyMaterial_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "StudyMaterial_classId_subjectId_idx" ON "StudyMaterial"("classId", "subjectId");
CREATE INDEX IF NOT EXISTS "StudyMaterial_teacherId_idx" ON "StudyMaterial"("teacherId");

-- ============================================================
-- NEW TABLES - Certificate
-- ============================================================
CREATE TABLE IF NOT EXISTS "Certificate" (
    "id" TEXT NOT NULL,
    "certificateNo" TEXT NOT NULL,
    "type" "CertificateType" NOT NULL,
    "studentId" TEXT,
    "staffId" TEXT,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "content" JSONB,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Certificate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Certificate_certificateNo_key" ON "Certificate"("certificateNo");
CREATE INDEX IF NOT EXISTS "Certificate_type_idx" ON "Certificate"("type");
CREATE INDEX IF NOT EXISTS "Certificate_studentId_idx" ON "Certificate"("studentId");
CREATE INDEX IF NOT EXISTS "Certificate_staffId_idx" ON "Certificate"("staffId");

-- ============================================================
-- NEW TABLES - IDCard
-- ============================================================
CREATE TABLE IF NOT EXISTS "IDCard" (
    "id" TEXT NOT NULL,
    "studentId" TEXT,
    "staffId" TEXT,
    "cardNo" TEXT NOT NULL,
    "issueDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "qrData" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IDCard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "IDCard_studentId_key" ON "IDCard"("studentId");
CREATE UNIQUE INDEX IF NOT EXISTS "IDCard_staffId_key" ON "IDCard"("staffId");
CREATE UNIQUE INDEX IF NOT EXISTS "IDCard_cardNo_key" ON "IDCard"("cardNo");
CREATE INDEX IF NOT EXISTS "IDCard_cardNo_idx" ON "IDCard"("cardNo");

-- ============================================================
-- FOREIGN KEYS FOR NEW TABLES
-- ============================================================

-- FeeStructure -> FeeCategory
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FeeStructure_categoryId_fkey') THEN
        ALTER TABLE "FeeStructure" ADD CONSTRAINT "FeeStructure_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "FeeCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Expense -> ExpenseCategory
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Expense_categoryId_fkey') THEN
        ALTER TABLE "Expense" ADD CONSTRAINT "Expense_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ExpenseCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- StaffDocument -> Staff
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StaffDocument_staffId_fkey') THEN
        ALTER TABLE "StaffDocument" ADD CONSTRAINT "StaffDocument_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- StaffAttendance -> Staff
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StaffAttendance_staffId_fkey') THEN
        ALTER TABLE "StaffAttendance" ADD CONSTRAINT "StaffAttendance_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- StudentDocument -> Student
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudentDocument_studentId_fkey') THEN
        ALTER TABLE "StudentDocument" ADD CONSTRAINT "StudentDocument_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Timetable -> Class
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Timetable_classId_fkey') THEN
        ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Timetable -> Subject
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Timetable_subjectId_fkey') THEN
        ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Timetable -> Staff
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Timetable_teacherId_fkey') THEN
        ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Homework -> Class
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Homework_classId_fkey') THEN
        ALTER TABLE "Homework" ADD CONSTRAINT "Homework_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Homework -> Subject
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Homework_subjectId_fkey') THEN
        ALTER TABLE "Homework" ADD CONSTRAINT "Homework_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Homework -> Staff
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Homework_teacherId_fkey') THEN
        ALTER TABLE "Homework" ADD CONSTRAINT "Homework_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- HomeworkSubmission -> Homework
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'HomeworkSubmission_homeworkId_fkey') THEN
        ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_homeworkId_fkey" FOREIGN KEY ("homeworkId") REFERENCES "Homework"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- HomeworkSubmission -> Student
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'HomeworkSubmission_studentId_fkey') THEN
        ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- StudyMaterial -> Class
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudyMaterial_classId_fkey') THEN
        ALTER TABLE "StudyMaterial" ADD CONSTRAINT "StudyMaterial_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- StudyMaterial -> Subject
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudyMaterial_subjectId_fkey') THEN
        ALTER TABLE "StudyMaterial" ADD CONSTRAINT "StudyMaterial_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- StudyMaterial -> Staff
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StudyMaterial_teacherId_fkey') THEN
        ALTER TABLE "StudyMaterial" ADD CONSTRAINT "StudyMaterial_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
END $$;

-- Certificate -> Student
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Certificate_studentId_fkey') THEN
        ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- Certificate -> Staff
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Certificate_staffId_fkey') THEN
        ALTER TABLE "Certificate" ADD CONSTRAINT "Certificate_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- IDCard -> Student
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IDCard_studentId_fkey') THEN
        ALTER TABLE "IDCard" ADD CONSTRAINT "IDCard_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- IDCard -> Staff
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'IDCard_staffId_fkey') THEN
        ALTER TABLE "IDCard" ADD CONSTRAINT "IDCard_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

-- ============================================================
-- RECORD THIS MIGRATION IN _prisma_migrations
-- ============================================================
INSERT INTO "_prisma_migrations" ("id", "checksum", "finished_at", "migration_name", "logs", "rolled_back_at", "started_at", "applied_steps_count")
VALUES (
    '20260523000001',
    md5('sync_schema_with_db'),
    NOW(),
    '20260523000001_sync_schema_with_db',
    '{ "created_at": "' || NOW()::text || '" }',
    NULL,
    NOW(),
    1
) ON CONFLICT ("id") DO NOTHING;
