/**
 * Offline checks for the Prisma->Mongo query translator.
 *
 * The translator is pure, so it can be verified without a live connection -
 * important because the cluster credentials are not available in CI.
 *
 * Run: npx ts-node --compiler-options '{"module":"commonjs"}' script/test-query.ts
 */

import assert from "node:assert";
import { toMongoFilter, toMongoSort } from "../lib/db/query";

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

console.log("toMongoFilter");

check("literal equality", toMongoFilter({ name: "x" }), { name: "x" });

check("explicit equals", toMongoFilter({ name: { equals: "x" } }), { name: { $eq: "x" } });

check(
  "in list",
  toMongoFilter({ status: { in: ["PAID", "PARTIAL"] } }),
  { status: { $in: ["PAID", "PARTIAL"] } }
);

check(
  "notIn list",
  toMongoFilter({ status: { notIn: ["PAID"] } }),
  { status: { $nin: ["PAID"] } }
);

const d = new Date("2024-01-01T00:00:00.000Z");
check("date range", toMongoFilter({ createdAt: { gte: d, lt: d } }), {
  createdAt: { $gte: d, $lt: d },
});

check("not equal", toMongoFilter({ role: { not: "ADMIN" } }), { role: { $ne: "ADMIN" } });

check("null match", toMongoFilter({ classId: null }), { classId: null });

check(
  "contains -> case-insensitive regex",
  toMongoFilter({ name: { contains: "a.b" } }),
  { name: { $regex: "a\\.b", $options: "i" } }
);

check(
  "startsWith anchored",
  toMongoFilter({ name: { startsWith: "ab" } }),
  { name: { $regex: "^ab", $options: "i" } }
);

check(
  "endsWith anchored",
  toMongoFilter({ name: { endsWith: "ab" } }),
  { name: { $regex: "ab$", $options: "i" } }
);

check(
  "OR",
  toMongoFilter({ OR: [{ a: 1 }, { b: 2 }] }),
  { $or: [{ a: 1 }, { b: 2 }] }
);

check(
  "AND array",
  toMongoFilter({ AND: [{ a: 1 }, { b: 2 }] }),
  { $and: [{ a: 1 }, { b: 2 }] }
);

check(
  "NOT -> $nor",
  toMongoFilter({ NOT: [{ a: 1 }] }),
  { $nor: [{ a: 1 }] }
);

check(
  "OR with nested operators",
  toMongoFilter({ OR: [{ status: { in: ["A"] } }, { count: { gt: 5 } }] }),
  { $or: [{ status: { $in: ["A"] } }, { count: { $gt: 5 } }] }
);

check("undefined values dropped", toMongoFilter({ a: 1, b: undefined }), { a: 1 });

check("empty where", toMongoFilter(undefined), {});
check("empty object where", toMongoFilter({}), {});

console.log("\ntoMongoSort");

check("string shorthand", toMongoSort("name"), { name: 1 });
check("object asc", toMongoSort({ name: "asc" }), { name: 1 });
check("object desc", toMongoSort({ name: "desc" }), { name: -1 });
check("mixed case", toMongoSort({ name: "DESC" }), { name: -1 });
check(
  "array of objects",
  toMongoSort([{ a: "asc" }, { b: "desc" }]),
  { a: 1, b: -1 }
);
check("_count ignored", toMongoSort({ _count: "desc", a: "asc" }), { a: 1 });
check("undefined", toMongoSort(undefined), undefined);

console.log(`\n${passed} checks passed.`);