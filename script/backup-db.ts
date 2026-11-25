/**
 * Read-only backup: writes every collection to backups/<timestamp>/<name>.json
 * as Extended JSON, so ObjectIds and dates survive a restore. Never writes to
 * the database.
 *
 * Run:      npm run db:backup
 * Restore:  mongoimport --uri "$MONGODB_URI" --collection <name> --jsonArray --file <name>.json
 *           (or ask for a restore script)
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { EJSON } from "bson";

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI is not set");

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  const database = mongoose.connection.db!;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = path.join(process.cwd(), "backups", `${database.databaseName}-${stamp}`);
  fs.mkdirSync(dir, { recursive: true });

  const collections = await database.listCollections({}, { nameOnly: true }).toArray();
  let total = 0;
  for (const { name } of collections) {
    if (name.startsWith("system.")) continue;
    const docs = await database.collection(name).find().toArray();
    fs.writeFileSync(path.join(dir, `${name}.json`), EJSON.stringify(docs, undefined, 0, { relaxed: false }));
    total += docs.length;
    console.log(`  ${name.padEnd(28)} ${docs.length}`);
  }

  console.log(`\n✅ Backed up ${total} documents from ${collections.length} collections to:\n   ${dir}`);
}

main()
  .catch((e) => {
    console.error("❌ Backup failed:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
