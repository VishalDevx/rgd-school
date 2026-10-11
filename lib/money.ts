/**
 * Money helpers.
 *
 * Money is stored in MongoDB as a `Double` (`Float`). MongoDB has no exact
 * decimal type in Prisma's MongoDB connector, and a double's 53-bit mantissa
 * represents values like 12345.67 exactly (safe to ~9e15), so storing money as
 * a double is numerically safe for this domain.
 *
 * The remaining risk is *accumulated* float error when summing many values, so
 * every write and every computed total goes through `money()` to snap back to
 * 2 decimal places.
 */

/** Round to 2 decimal places, avoiding the usual 0.1 + 0.2 style drift. */
export function money(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return 0;
  // Multiply, round, divide. Works around 1.005 -> 1.00 float representation.
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Sum a list of amounts safely. */
export function sumMoney(values: Array<number | string | null | undefined>): number {
  return money(values.reduce<number>((acc, v) => acc + money(v), 0));
}

/** Coerce anything Prisma's Decimal used to return into a plain number. */
export function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "string") return money(value);
  // Covers Mongoose Decimal128 and any Decimal-like object.
  const maybe = value as { toNumber?: () => number; toString?: () => string };
  if (typeof maybe.toNumber === "function") return maybe.toNumber();
  if (typeof maybe.toString === "function") return money(maybe.toString());
  return 0;
}