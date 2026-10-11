import "dotenv/config";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/mongodb";
import { db } from "@/lib/db";
import mongoose from "mongoose";

(async () => {
  await connectDB();
  const cases = [
    ["admin@school.com", "Admin@123", "ADMIN"],
    ["staff@school.com", "Staff@123", "STAFF"],
    ["student@school.com", "Student@123", "STUDENT"],
  ];
  let bad = 0;
  for (const [email, pass, role] of cases) {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) { console.log(`FAIL ${email}: not found`); bad++; continue; }
    const valid = await bcrypt.compare(pass, user.passwordHash!);
    const roleOk = user.role === role;
    console.log(`${valid && roleOk ? "ok  " : "FAIL"} ${email} pw=${valid} role=${user.role}`);
    if (!valid || !roleOk) bad++;
  }

  // student login by aadhar, as auth.ts does
  const byAadhar = await db.user.findUnique({ where: { adharNo: "123456789012" } });
  const aadharOk = !!byAadhar && (await bcrypt.compare("Student@123", byAadhar.passwordHash!));
  console.log(`${aadharOk ? "ok  " : "FAIL"} aadhar login lookup -> ${byAadhar?.email}`);
  if (!aadharOk) bad++;

  console.log(bad === 0 ? "\nLOGIN PATH OK" : `\n${bad} FAILURES`);
  process.exitCode = bad === 0 ? 0 : 1;
  await mongoose.disconnect();
})();
