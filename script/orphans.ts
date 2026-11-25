/**
 * Find (and optionally remove) Student / Staff records whose login (User) no
 * longer exists. These were left behind by the old delete code and crash any
 * page that shows the person's name.
 *
 *   npm run db:orphans          # report only, changes nothing
 *   npm run db:orphans -- --fix # delete them and their attendance, results...
 *
 * Students with fee payments on record are never deleted; they are reported
 * so you can decide what to do with the money records.
 * Take a backup first: npm run db:backup
 */
import "dotenv/config";
import mongoose, { Types } from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { cascade } from "@/lib/db/cascade";

type Row = { _id: Types.ObjectId; userId: Types.ObjectId; admissionNo?: string; designation?: string };

async function main() {
  const fix = process.argv.includes("--fix");
  await connectDB();
  const d = mongoose.connection.db!;
  const userIds = new Set(
    (await d.collection("users").find({}, { projection: { _id: 1 } }).toArray()).map((u) => String(u._id))
  );

  for (const [collection, model, label] of [
    ["students", "Student", "admission no."],
    ["staffs", "Staff", "designation"],
  ] as const) {
    const rows = (await d
      .collection(collection)
      .find({}, { projection: { userId: 1, admissionNo: 1, designation: 1 } })
      .toArray()) as unknown as Row[];
    const orphans = rows.filter((r) => !userIds.has(String(r.userId)));
    console.log(`\n${model}: ${orphans.length} orphaned of ${rows.length}`);

    const deletable: Types.ObjectId[] = [];
    for (const o of orphans) {
      const paid =
        model === "Student"
          ? (await d.collection("feetransactions").countDocuments({ studentId: o._id, voided: { $ne: true } })) +
            (await d.collection("feepayments").countDocuments({ studentId: o._id, amountPaid: { $gt: 0 } }))
          : 0;
      console.log(`  ${o._id}  ${label} ${o.admissionNo ?? o.designation ?? "-"}${paid ? "  (has fee payments - kept)" : ""}`);
      if (!paid) deletable.push(o._id);
    }

    if (fix && deletable.length) {
      await cascade(model, deletable);
      console.log(`  removed ${deletable.length} ${model.toLowerCase()} record(s) and their dependent data`);
    }
  }
  if (!fix) console.log("\nDry run: nothing changed. Re-run with --fix to remove them.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
