export type AppRole = "ADMIN" | "STAFF" | "STUDENT";

export interface NavItem {
  label: string;
  href: string;
  icon?: string;
}

export const sidebarItemsByRole: Record<AppRole, NavItem[]> = {
  ADMIN: [
    { label: "Dashboard", href: "/admin/dashboard", icon: "dashboard" },
    { label: "Classes", href: "/admin/classes", icon: "class" },
    { label: "Students", href: "/admin/students", icon: "students" },
    { label: "Bulk Import", href: "/admin/students/import", icon: "upload" },
    { label: "Staff", href: "/admin/staff", icon: "staff" },
    { label: "Subjects", href: "/admin/subjects", icon: "subject" },
    { label: "Exams", href: "/admin/exams", icon: "exam" },
    { label: "Exam Timetable", href: "/admin/date-sheet", icon: "DateSheet" },
    { label: "Weekly Timetable", href: "/admin/timetable", icon: "calendar" },
    { label: "Results", href: "/admin/results", icon: "results" },
    { label: "Promotion", href: "/admin/promotion", icon: "trending" },
    { label: "Academic Sessions", href: "/admin/academic-sessions", icon: "calendar" },
    { label: "Fees", href: "/admin/fees", icon: "fees" },
    { label: "Fee Structures", href: "/admin/fees/structures", icon: "wallet" },
    { label: "Attendance", href: "/admin/attendance", icon: "attendance" },
    { label: "Staff Attendance", href: "/admin/staff-attendance", icon: "attendance" },
    { label: "Leaves", href: "/admin/leaves", icon: "calendar" },
    { label: "Announcements", href: "/admin/announcements", icon: "announce" },
    { label: "Expenses", href: "/admin/expenses", icon: "expense" },
    { label: "Users", href: "/admin/users", icon: "user" },
    { label: "Settings", href: "/admin/settings", icon: "settings" },
    { label: "Logs", href: "/admin/logs", icon: "logs" },
    { label: "Staff Documents", href: "/admin/staff-documents", icon: "files" },
    { label: "Scheduled Jobs", href: "/admin/cron-jobs", icon: "cron" },
  ],
STAFF: [
  { label: "Dashboard", href: "/staff/dashboard", icon: "dashboard" },
  { label: "My Classes", href: "/staff/classes", icon: "class" },
  { label: "Attendance", href: "/staff/attendance", icon: "attendance" },
  { label: "My Attendance", href: "/staff/staff-attendance", icon: "attendance" },
  { label: "Exams", href: "/staff/exams", icon: "exam" },
  { label: "Results", href: "/staff/results", icon: "results" },
  { label: "Homework", href: "/staff/homework", icon: "homework" },
  { label: "Study Materials", href: "/staff/study-materials", icon: "book" },
  { label: "Timetable", href: "/staff/timetable", icon: "calendar" },
  { label: "Certificates", href: "/staff/certificates", icon: "award" },
  { label: "ID Card", href: "/staff/id-card", icon: "credit-card" },
  { label: "Notifications", href: "/staff/notifications", icon: "bell" },
  { label: "Announcements", href: "/staff/announcements", icon: "announce" },
  { label: "Leave", href: "/staff/leaves", icon: "calendar" },
  { label: "Profile", href: "/staff/profile", icon: "user" },
],

STUDENT: [
  { label: "Dashboard", href: "/student/dashboard", icon: "dashboard" },
  { label: "Attendance", href: "/student/attendance", icon: "attendance" },
  { label: "Exams", href: "/student/exams", icon: "exam" },
  { label: "Exam Date Sheet", href: "/student/date-sheet", icon: "calendar" },
  { label: "Results", href: "/student/results", icon: "results" },
  { label: "Homework", href: "/student/homework", icon: "homework" },
  { label: "Study Materials", href: "/student/study-materials", icon: "book" },
  { label: "Timetable", href: "/student/timetable", icon: "calendar" },
  { label: "Certificates", href: "/student/certificates", icon: "award" },
  { label: "ID Card", href: "/student/id-card", icon: "credit-card" },
  { label: "Marksheet", href: "/student/marksheet", icon: "file-text" },
  { label: "Fees", href: "/student/fees", icon: "fees" },
  { label: "Notifications", href: "/student/notifications", icon: "bell" },
  { label: "Leave", href: "/student/leaves", icon: "calendar" },
  { label: "Announcements", href: "/student/announcements", icon: "announce" },
  { label: "Profile", href: "/student/profile", icon: "user" },
]

};
