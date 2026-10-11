import { db } from "@/lib/db"

async function fixPasswords() {
  const users = await db.user.findMany()
  for (const u of users) {
   
    if (!u.passwordHash || !u.passwordHash.startsWith("$2")) {
      console.log(`Skipping ${u.email} — no valid password to hash`)
      continue
    }
  }
  console.log("✅ Checked all users.")
  process.exit(0)
}

fixPasswords().catch((err) => {
  console.error(err)
  process.exit(1)
})
