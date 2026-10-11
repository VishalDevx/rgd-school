/**
 * Translates Prisma-style `where` clauses into MongoDB filters.
 *
 * Prisma and Mongoose use different operator vocabularies (`in` vs `$in`,
 * `AND` vs `$and`), so every query in the app goes through here. The goal is
 * that the 120 route files keep reading like Prisma while the driver only ever
 * sees native Mongo syntax - and never a Prisma-shaped object that Mongo would
 * silently misinterpret.
 */

import type { FilterQuery } from "mongoose";

type AnyObj = Record<string, any>;

/** Operators Prisma supports that map to a Mongo comparison operator. */
const COMPARISON_OPS: Record<string, string> = {
  lt: "$lt",
  lte: "$lte",
  gt: "$gt",
  gte: "$gte",
  not: "$ne",
  equals: "$eq",
};

const LIST_OPS: Record<string, string> = {
  in: "$in",
  notIn: "$nin",
};

/** Escape a user string before embedding it in a $regex. */
function escapeRegex(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isPlainObject(value: unknown): value is AnyObj {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    !(value instanceof Date) &&
    !(value instanceof RegExp)
  );
}

/**
 * A Prisma filter object is a plain object whose keys are all operators
 * (`{ in: [...] }`) as opposed to a literal value (`{ name: "x" }`).
 */
function isOperatorObject(value: AnyObj): boolean {
  const keys = Object.keys(value);
  if (keys.length === 0) return false;
  return keys.every(
    (k) => k in COMPARISON_OPS || k in LIST_OPS || ["contains", "startsWith", "endsWith", "mode"].includes(k)
  );
}

function translateValue(key: string, value: unknown): AnyObj {
  if (value === null) return { $eq: null };

  if (value instanceof Date || typeof value !== "object") return { $eq: value };

  if (value instanceof RegExp) return { $eq: value };

  if (Array.isArray(value)) {
    // Bare array means "equals one of" in Prisma.
    return { $in: value };
  }

  if (!isPlainObject(value)) return { $eq: value };

  // Compound unique filter, e.g. `where: { studentId_date: { studentId, date } }`.
  // Handled upstream by the repository; if it reaches here it is a literal
  // sub-document match.
  const out: AnyObj = {};

  for (const [op, operand] of Object.entries(value)) {
    switch (op) {
      case "in":
        out.$in = Array.isArray(operand) ? operand : [operand];
        break;
      case "notIn":
        out.$nin = Array.isArray(operand) ? operand : [operand];
        break;
      case "contains":
        out.$regex = escapeRegex(String(operand));
        out.$options = "i";
        break;
      case "startsWith":
        out.$regex = `^${escapeRegex(String(operand))}`;
        out.$options = "i";
        break;
      case "endsWith":
        out.$regex = `${escapeRegex(String(operand))}$`;
        out.$options = "i";
        break;
      case "mode":
        // Case-sensitivity modifier consumed alongside contains/startsWith/endsWith.
        if (operand === "insensitive") out.$options = "i";
        break;
      case "equals":
        out.$eq = operand;
        break;
      case "lt":
      case "lte":
      case "gt":
      case "gte":
      case "not":
        out[COMPARISON_OPS[op]] = operand;
        break;
      default:
        // Guard against operator injection: a caller-supplied `$`-prefixed key
        // is never a valid Prisma operator, so drop it rather than passing raw
        // Mongo syntax through to the driver.
        if (op.startsWith("$")) break;
        // Unknown operator - pass the value through untouched.
        out[op] = operand;
        break;
    }
  }

  // `mode: "insensitive"` with no regex-producing op is meaningless; drop it.
  if (!out.$regex && out.$options) delete out.$options;

  return out;
}

/**
 * Translate a Prisma `where` object into a Mongoose filter.
 *
 * @param where        Prisma-style where clause
 * @param relationKeys Populated relation names (e.g. "class") that must always
 *                     be included so `populate` can match. These are ANDed on
 *                     so a filter on a relation still narrows the parent query.
 */
export function toMongoFilter(where: AnyObj | undefined, relationKeys: string[] = []): FilterQuery<any> {
  if (!where) return {};

  const andParts: AnyObj[] = [];

  for (const [key, value] of Object.entries(where)) {
    if (value === undefined) continue;

    switch (key) {
      case "AND": {
        const list = (Array.isArray(value) ? value : [value]) as AnyObj[];
        for (const clause of list) {
          andParts.push(toMongoFilter(clause, relationKeys));
        }
        break;
      }
      case "OR": {
        const list = (Array.isArray(value) ? value : [value]) as AnyObj[];
        const orParts = list.map((clause) => toMongoFilter(clause, relationKeys));
        if (orParts.length > 0) andParts.push({ $or: orParts });
        break;
      }
      case "NOT": {
        const list = (Array.isArray(value) ? value : [value]) as AnyObj[];
        const notParts = list.map((clause) => toMongoFilter(clause, relationKeys));
        if (notParts.length > 0) andParts.push({ $nor: notParts });
        break;
      }
      default:
        if (value === null) {
          andParts.push({ [key]: null });
        } else if (isOperatorObject(value)) {
          andParts.push({ [key]: translateValue(key, value) });
        } else if (isPlainObject(value) && !Array.isArray(value) && !(value instanceof Date)) {
          // Nested object that is not an operator bag: treat as a sub-document
          // equality match (used by Json/Mixed fields).
          andParts.push({ [key]: value });
        } else {
          andParts.push({ [key]: value });
        }
        break;
    }
  }

  // Always AND the relation-presence filters.
  for (const rel of relationKeys) {
    andParts.push({ [rel]: { $exists: true } });
  }

  if (andParts.length === 0) return {};
  if (andParts.length === 1) return andParts[0];
  return { $and: andParts };
}

/** Translate Prisma `orderBy` (string | object | array) into a Mongo sort spec. */
export function toMongoSort(orderBy: unknown): Record<string, 1 | -1> | undefined {
  if (!orderBy) return undefined;

  const spec: Record<string, 1 | -1> = {};
  const visit = (node: any) => {
    if (!node) return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (typeof node === "string") {
      spec[node] = 1;
      return;
    }
    if (isPlainObject(node)) {
      for (const [field, dir] of Object.entries(node)) {
        if (field === "_count") continue;
        if (typeof dir === "string") {
          spec[field] = dir.toLowerCase() === "desc" ? -1 : 1;
        } else if (isPlainObject(dir)) {
          // Nested relation order, e.g. { class: { grade: "asc" } } - resolved
          // by the repository via populate sort, not handled here.
        }
      }
    }
  };
  visit(orderBy);

  return Object.keys(spec).length > 0 ? spec : undefined;
}

/** Prisma `take` / `skip`. */
export function toSkipTake(args: { take?: number; skip?: number }): {
  skip?: number;
  limit?: number;
} {
  const out: { skip?: number; limit?: number } = {};
  if (typeof args.take === "number") out.limit = args.take;
  if (typeof args.skip === "number") out.skip = args.skip;
  return out;
}