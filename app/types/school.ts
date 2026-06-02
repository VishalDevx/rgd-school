

export interface IUser {
  id: string;
  email: string;
  passwordHash?: string | null;
  name: string;
  role: Role;
  phone?: string | null;
  createdAt: Date;
  updatedAt: Date;
  image?: string | null;
  emailVerified?: Date | null;
  adharNo: string;
}
export interface IStudent {
  id: string;
  userId: string;
  admissionNo: string;
  rollNumber: string;
  admissionDate: Date;
  dob?: Date | null;
  gender?: Gender | null;
  address?: string | null;
  classId?: string | null;
  active: boolean;
  profileImg?: string | null;
  fatherName?: string | null;
  motherName?: string | null;
  occupation: string;
  religion: string;
  caste: string;
  contactNo?: string | null;
  user: IUser;
}

export interface IClass {
  id: string;
  name: string;
  grade: Grade;
  section?: string | null;
  gradeCode?: string | null;
  teacherId?: string | null;
  createdAt: Date;
}
export interface IFeeStructure {
  id: string;
  classId: string;
  name?: string | null;
  examFee?: number | null;
  transportFee?: number | null;
  miscFee?: number | null;
  total: number;
  monthlyFee?: number | null;
  totalMonths: number;
  createdAt: Date;
}
export interface IFeePayment {
  id: string;
  studentId: string;
  feeStructureId: string;
  amountPaid: number;
  remainAmount: number;
  status: FeeStatus;
  paymentDate?: Date | null;
  razorpayOrder?: string | null;
  razorpayPaymentId?: string | null;
  receiptUrl?: string | null;
  createdAt: Date;
}

export interface IExpense {
  id: string;
  title: string;
  description?: string | null;
  amount: number;
  date: Date;
  createdById: string;
  transaction: TransactionType;
}
export interface IAttendance {
  id: string;
  classId: string;
  studentId: string;
  date: Date;
  status: AttendanceStatus;
  markedById: string;
  createdAt: Date;
}
export interface IExam {
  id: string;
  name: string;
  classId: string;
  startDate: Date;
  endDate: Date;
  createdById: string;
  createdAt: Date;
}
export interface IResult {
  id: string;
  studentId: string;
  examId: string;
  subjectId: string;
  marks: number;
  maxMarks: number;
  grade?: string | null;
  remarks?: string | null;
  uploadedBy?: string | null;
  createdAt: Date;
}
export interface ISubject {
  id: string;
  name: string;
  code: string;
  classId: string;
  teacherId?: string | null;
}
export enum Role {
  ADMIN = "ADMIN",
  STAFF = "STAFF",
  STUDENT = "STUDENT",
}

export enum Gender {
  MALE = "MALE",
  FEMALE = "FEMALE",
  OTHER = "OTHER",
}

export enum FeeStatus {
  PENDING = "PENDING",
  PAID = "PAID",
  PARTIAL = "PARTIAL",
}

export enum AttendanceStatus {
  PRESENT = "PRESENT",
  ABSENT = "ABSENT",
  LATE = "LATE",
  LEAVE = "LEAVE",
}

export enum TransactionType {
  CREDIT = "CREDIT",
  DEBIT = "DEBIT",
}

export enum Grade {
  NURSERY = "NURSERY",
  LKG = "LKG",
  UKG = "UKG",
  ONE = "ONE",
  TWO = "TWO",
  THREE = "THREE",
  FOUR = "FOUR",
  FIVE = "FIVE",
  SIX = "SIX",
  SEVEN = "SEVEN",
  EIGHT = "EIGHT",
  NINE = "NINE",
  TEN = "TEN",
}
