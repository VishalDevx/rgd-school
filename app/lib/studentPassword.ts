import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function resetAllStudentPasswords(defaultPassword: string) {
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  await db.user.updateMany({
    where: { role: "STUDENT" },
    data: { passwordHash: hashedPassword },
  });

  return { message: "All student passwords have been reset." };
}
