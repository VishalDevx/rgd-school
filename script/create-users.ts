// Must be first: loads .env before anything reads process.env.MONGODB_URI.
import "dotenv/config";

import { db } from "@/lib/db";
import { Role } from "@/lib/enums";
import bcrypt from "bcryptjs";

async function main() {
  const hash = await bcrypt.hash("Pass@123", 10);

  const admin = await db.user.upsert({
    where: { email: "admin@school.com" },
    update: { passwordHash: hash, role: Role.ADMIN },
    create: {
      name: "School Admin",
      email: "admin@school.com",
      passwordHash: hash,
      role: Role.ADMIN,
      adharNo: "111122223333",
    },
  });
  console.log("✅ Admin:", admin.email, "/ Pass@123");

  const staff = await db.user.upsert({
    where: { email: "teacher@school.com" },
    update: { passwordHash: hash, role: Role.STAFF },
    create: {
      name: "Rahul Teacher",
      email: "teacher@school.com",
      passwordHash: hash,
      role: Role.STAFF,
      adharNo: "222233334444",
    },
  });

  await db.staff.upsert({
    where: { userId: staff.id },
    update: {},
    create: {
      userId: staff.id,
      staffId: "TCH-001",
      designation: "Teacher",
      department: "Science",
    },
  });
  console.log("✅ Staff:", staff.email, "/ Pass@123");

  const studentUser = await db.user.upsert({
    where: { email: "student@school.com" },
    update: { passwordHash: hash, role: Role.STUDENT },
    create: {
      name: "Amit Student",
      email: "student@school.com",
      passwordHash: hash,
      role: Role.STUDENT,
      adharNo: "333344445555",
    },
  });

  await db.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      userId: studentUser.id,
      admissionNo: "ADM-1001",
      rollNumber: "01",
    },
  });
  console.log("✅ Student:", studentUser.email, "/ Pass@123");

  console.log("\n🎉 Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
