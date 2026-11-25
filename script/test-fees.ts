/**
 * Offline checks for the fee arithmetic in `lib/fees/calc.ts` and the input
 * rules in `lib/fees/validation.ts`. Pure functions, no database needed.
 *
 * Run: npm run test:fees
 */

import assert from "node:assert";
import {
  amountInWords,
  checkPayment,
  computeBalance,
  dueForStudent,
  formatINR,
  formatReceiptNo,
  structureBreakdown,
  structureTotal,
} from "../lib/fees/calc";
import { feeStructureInput, paymentInput } from "../lib/fees/validation";

let passed = 0;
function check(name: string, actual: unknown, expected: unknown) {
  try {
    assert.deepStrictEqual(actual, expected);
    passed++;
    console.log(`  ok  ${name}`);
  } catch {
    console.log(`FAIL  ${name}`);
    console.log(`      actual:   ${JSON.stringify(actual)}`);
    console.log(`      expected: ${JSON.stringify(expected)}`);
    process.exitCode = 1;
  }
}

console.log("structure totals");

check("lump-sum structure adds every component", structureTotal({ examFee: 500, miscFee: 250, transportFee: 1200 }), 1950);
check(
  "monthly structure includes exam, misc and transport (old code dropped them)",
  structureTotal({ monthlyFee: 450, totalMonths: 12, examFee: 500, miscFee: 100, transportFee: 1200 }),
  450 * 12 + 500 + 100 + 1200
);
check("months default to 12", structureBreakdown({ monthlyFee: 100 }).tuition, 1200);
check("months ignored without a monthly fee", structureBreakdown({ totalMonths: 10, examFee: 10 }).tuition, 0);
check("float drift is rounded away", structureTotal({ examFee: 0.1, miscFee: 0.2 }), 0.3);

console.log("\ndue per student");

const s = { monthlyFee: 450, totalMonths: 12, examFee: 500, transportFee: 1200 };
check("transport user pays everything", dueForStudent(s, true), 5400 + 500 + 1200);
check(
  "non-transport student is not charged transport (and is not under-billed)",
  dueForStudent(s, false),
  5400 + 500
);

console.log("\nbalances");

check("no transactions -> pending", computeBalance(1000, []).status, "PENDING");
check("part payment -> partial", computeBalance(1000, [{ amount: 400 }]).remainAmount, 600);
check("full payment -> paid", computeBalance(1000, [{ amount: 600 }, { amount: 400 }]).status, "PAID");
check(
  "discount reduces what is owed, is NOT counted as money paid",
  (({ amountPaid, remainAmount, netPayable }) => ({ amountPaid, remainAmount, netPayable }))(
    computeBalance(1000, [{ amount: 500, discount: 100 }])
  ),
  { amountPaid: 500, remainAmount: 400, netPayable: 900 }
);
check(
  "late fine increases what is owed (old code subtracted it from the payment)",
  computeBalance(1000, [{ amount: 1000, lateFine: 50 }]).remainAmount,
  50
);
check(
  "voided receipts are ignored",
  computeBalance(1000, [{ amount: 1000, voided: true }, { amount: 200 }]).amountPaid,
  200
);
check("full concession -> paid", computeBalance(1000, [{ amount: 0, discount: 1000 }]).status, "PAID");
check("concession only -> partial", computeBalance(1000, [{ amount: 0, discount: 10 }]).status, "PARTIAL");
check("zero-due account is paid", computeBalance(0, []).status, "PAID");
check("overpayment never shows negative balance", computeBalance(100, [{ amount: 150 }]).remainAmount, 0);

console.log("\npayment validation");

const open = computeBalance(1000, [{ amount: 300 }]); // 700 due
check("exact balance accepted", checkPayment(open, { amount: 700 }).ok, true);
check("overpayment rejected", checkPayment(open, { amount: 701 }).ok, false);
check("amount + discount may settle the balance", checkPayment(open, { amount: 600, discount: 100 }).ok, true);
check("amount + discount may not exceed it", checkPayment(open, { amount: 650, discount: 100 }).ok, false);
check("late fine raises the ceiling", checkPayment(open, { amount: 750, lateFine: 50 }).ok, true);
check("empty receipt rejected", checkPayment(open, { amount: 0 }).ok, false);
check("negative rejected", checkPayment(open, { amount: -5 }).ok, false);
check(
  "paid account rejects more money",
  checkPayment(computeBalance(100, [{ amount: 100 }]), { amount: 1 }).ok,
  false
);

console.log("\nformatting");

check("receipt number", formatReceiptNo("rgd", 42), "RGD000042");
check("receipt number default prefix", formatReceiptNo("  ", 7), "RCP000007");
check("Indian grouping", formatINR(1234567), "12,34,567");
check("Indian grouping with paise", formatINR(1234.5), "1,234.50");
check("words: zero", amountInWords(0), "Zero Rupees Only");
check("words: teens", amountInWords(15), "Fifteen Rupees Only");
check("words: lakh", amountInWords(125050), "One Lakh Twenty Five Thousand Fifty Rupees Only");
check(
  "words: crore with paise",
  amountInWords(10000001.25),
  "One Crore One Rupees and Twenty Five Paise Only"
);

console.log("\ninput validation");

const id = "64b7f0c2a1b2c3d4e5f60718";
check(
  "structure coerces form strings",
  feeStructureInput.safeParse({ classId: id, monthlyFee: "450", totalMonths: "12", examFee: "" }).success,
  true
);
check("structure needs some amount", feeStructureInput.safeParse({ classId: id }).success, false);
check("structure rejects bad class id", feeStructureInput.safeParse({ classId: "x", examFee: 5 }).success, false);

const parsed = paymentInput.safeParse({ studentId: id, feeStructureId: id, amountPaid: "500" });
check("payment accepts legacy amountPaid", parsed.success && parsed.data.amount, 500);
check("payment defaults to cash", parsed.success && parsed.data.paymentMode, "CASH");
check(
  "payment rejects negative discount",
  paymentInput.safeParse({ studentId: id, feeStructureId: id, amount: 1, discount: -1 }).success,
  false
);
check(
  "payment rejects future dates",
  paymentInput.safeParse({
    studentId: id,
    feeStructureId: id,
    amount: 1,
    paymentDate: new Date(Date.now() + 7 * 86400000).toISOString(),
  }).success,
  false
);

console.log(process.exitCode ? "\nSome fee checks FAILED." : `\nAll ${passed} fee checks passed.`);
