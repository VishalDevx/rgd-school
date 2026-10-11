// Must be first: loads .env before anything reads process.env.MONGODB_URI.
import "dotenv/config";

import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

async function main() {
  for (const email of ["admin@school.com", "teacher@school.com", "student@school.com"]) {
    const user = await db.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`❌ ${email}: not found`);
      continue;
    }
    const match = await bcrypt.compare("Pass@123", user.passwordHash!);
    console.log(`${email} (${user.role}) → password match: ${match}`);
  }
}

main().finally(() => db.$disconnect());
