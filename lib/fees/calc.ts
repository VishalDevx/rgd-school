/**
 * Fee arithmetic. Pure functions only: no database, no I/O, so every rule the
 * fee module depends on is unit-tested in `script/test-fees.ts`.
 *
 * Vocabulary
 *   structure  - what a class is charged (tuition + exam + misc + transport)
 *   account    - one student's balance against one structure (`FeePayment`)
 *   transaction- one receipt against an account (`FeeTransaction`)
 */

import { money, sumMoney } from "@/lib/money";
import { FeeStatus } from "@/lib/enums";

export interface StructureAmounts {
  monthlyFee?: number | null;
  totalMonths?: number | null;
  examFee?: number | null;
  transportFee?: number | null;
  miscFee?: number | null;
}

export interface StructureBreakdown {
  tuition: number;
  exam: number;
  misc: number;
  transport: number;
  /** Gross total for a student who uses transport. */
  total: number;
}

/**
 * Break a structure into its parts.
 *
 * Previously monthly-mode structures stored `monthlyFee x months` as the total
 * and silently dropped exam/misc/transport, yet still *subtracted* transport for
 * non-transport students, so those students were under-billed. Every component
 * now counts in both modes.
 */
export function structureBreakdown(s: StructureAmounts): StructureBreakdown {
  const monthly = money(s.monthlyFee);
  const months = monthly > 0 ? Math.max(1, Math.trunc(Number(s.totalMonths) || 12)) : 0;
  const tuition = money(monthly * months);
  const exam = money(s.examFee);
  const misc = money(s.miscFee);
  const transport = money(s.transportFee);
  return { tuition, exam, misc, transport, total: sumMoney([tuition, exam, misc, transport]) };
}

export function structureTotal(s: StructureAmounts): number {
  return structureBreakdown(s).total;
}

/** What one student owes on a structure, before concessions and fines. */
export function dueForStudent(s: StructureAmounts, includesTransport: boolean): number {
  const b = structureBreakdown(s);
  return includesTransport ? b.total : money(b.total - b.transport);
}

export interface TransactionAmounts {
  amount: number;
  discount?: number | null;
  lateFine?: number | null;
  voided?: boolean | null;
}

export interface AccountBalance {
  totalDue: number;
  discount: number;
  lateFine: number;
  /** totalDue - discount + lateFine */
  netPayable: number;
  amountPaid: number;
  remainAmount: number;
  status: FeeStatus;
}

/** Fold an account's transactions into its balance. Voided rows are ignored. */
export function computeBalance(
  totalDue: number,
  transactions: readonly TransactionAmounts[]
): AccountBalance {
  const live = transactions.filter((t) => !t.voided);
  const amountPaid = sumMoney(live.map((t) => t.amount));
  const discount = sumMoney(live.map((t) => t.discount ?? 0));
  const lateFine = sumMoney(live.map((t) => t.lateFine ?? 0));
  const due = money(totalDue);
  const netPayable = money(Math.max(due - discount + lateFine, 0));
  const remainAmount = money(Math.max(netPayable - amountPaid, 0));

  let status: FeeStatus;
  if (remainAmount <= 0) status = FeeStatus.PAID;
  else if (amountPaid > 0 || discount > 0) status = FeeStatus.PARTIAL;
  else status = FeeStatus.PENDING;

  return { totalDue: due, discount, lateFine, netPayable, amountPaid, remainAmount, status };
}

export type PaymentCheck = { ok: true } | { ok: false; error: string };

/**
 * Validate a new transaction against the account's current balance.
 * Rejects empty receipts and anything that would take the balance below zero.
 */
export function checkPayment(current: AccountBalance, tx: TransactionAmounts): PaymentCheck {
  const amount = money(tx.amount);
  const discount = money(tx.discount ?? 0);
  const lateFine = money(tx.lateFine ?? 0);

  if (amount < 0 || discount < 0 || lateFine < 0) {
    return { ok: false, error: "Amounts cannot be negative" };
  }
  if (amount === 0 && discount === 0) {
    return { ok: false, error: "Enter an amount or a discount" };
  }

  const payableNow = money(current.remainAmount + lateFine);
  if (discount > payableNow) {
    return { ok: false, error: `Discount exceeds the balance of ₹${formatINR(payableNow)}` };
  }
  const maxAmount = money(payableNow - discount);
  if (amount > maxAmount) {
    return {
      ok: false,
      error: `Amount exceeds the balance due of ₹${formatINR(maxAmount)}`,
    };
  }
  return { ok: true };
}

/** `RCP` + 6-digit zero-padded sequence, e.g. RCP000042. */
export function formatReceiptNo(prefix: string | null | undefined, seq: number): string {
  const clean = (prefix ?? "").trim().toUpperCase() || "RCP";
  return `${clean}${String(seq).padStart(6, "0")}`;
}

/** Indian grouping: 1234567.5 -> "12,34,567.50" (no decimals when whole). */
export function formatINR(value: number): string {
  const v = money(value);
  return v.toLocaleString("en-IN", {
    minimumFractionDigits: Number.isInteger(v) ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
  "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
  "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigits(n: number): string {
  if (n < 20) return ONES[n];
  return `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ""}`;
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${ONES[h]} Hundred` : "", rest ? twoDigits(rest) : ""].filter(Boolean).join(" ");
}

/** Amount in words using the Indian system, as printed on receipts. */
export function amountInWords(value: number): string {
  const v = money(value);
  let rupees = Math.floor(v);
  const paise = Math.round((v - rupees) * 100);
  if (rupees === 0 && paise === 0) return "Zero Rupees Only";

  const parts: string[] = [];
  const crore = Math.floor(rupees / 1_00_00_000);
  rupees %= 1_00_00_000;
  const lakh = Math.floor(rupees / 1_00_000);
  rupees %= 1_00_000;
  const thousand = Math.floor(rupees / 1000);
  rupees %= 1000;

  if (crore) parts.push(`${threeDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (rupees) parts.push(threeDigits(rupees));

  const rupeeText = parts.length ? `${parts.join(" ")} Rupees` : "";
  const paiseText = paise ? `${twoDigits(paise)} Paise` : "";
  return `${[rupeeText, paiseText].filter(Boolean).join(" and ")} Only`;
}
