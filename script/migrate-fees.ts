/**
 * One-off (and safe to re-run) migration to the receipt-based fee ledger.
 *
 *  - merges duplicate student/structure accounts left by the old code
 *  - turns each old running balance into a "legacy" receipt
 *  - fixes stored structure totals, bills students who were never billed
 *  - recomputes every balance and builds the new unique indexes
 *
 * Run: npm run fees:migrate
 * (Admins can trigger the same thing from Fees -> "Recalculate balances".)
 */
import "dotenv/config";
import mongoose from "mongoose";
import { recalculateAll } from "@/lib/fees/service";

recalculateAll()
  .then((r) => {
    console.log("Fee ledger migration complete:", r);
    return mongoose.disconnect();
  })
  .catch(async (err) => {
    console.error("Fee ledger migration failed:", err);
    await mongoose.disconnect();
    process.exit(1);
  });
