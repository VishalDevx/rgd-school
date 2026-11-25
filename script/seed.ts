// Must be first: loads .env before anything reads process.env.MONGODB_URI.
import "dotenv/config";

import mongoose from "mongoose";

import { connectDB } from "@/lib/mongodb";
import { seed } from "./seedData";

/**
 * Seed script for MongoDB.
 *
 * Run with:  npm run seed
 *
 * WARNING: wipes every collection. Refuses to run on a non-empty database
 * unless SEED_WIPE=yes-delete-everything is set.
 *
 * Requires MONGODB_URI in .env with a real password.
 */

async function main() {
  console.log("🌱 Connecting to MongoDB...");
  await connectDB();

  // seed() DELETES EVERY COLLECTION first. Refuse on a database that already
  // holds data unless the operator explicitly confirms.
  const existing = await mongoose.connection.db!.collection("users").countDocuments();
  if (existing > 0 && process.env.SEED_WIPE !== "yes-delete-everything") {
    console.error(
      [
        "",
        `⛔ Refusing to seed: database "${mongoose.connection.name}" already has ${existing} user(s).`,
        "   Seeding would permanently DELETE all existing data (students, fees, results...).",
        "   Take a backup first (npm run db:backup). To wipe anyway, run:",
        "   SEED_WIPE=yes-delete-everything npm run seed",
        "",
      ].join("\n")
    );
    process.exitCode = 1;
    return;
  }

  await seed();
  console.log("✅ FULL DATABASE SEEDED");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await mongoose.disconnect();
  });