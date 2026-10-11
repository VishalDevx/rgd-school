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
 * Requires MONGODB_URI in .env with a real password.
 */

async function main() {
  console.log("🌱 Connecting to MongoDB...");
  await connectDB();
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