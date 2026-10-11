import mongoose, { type Schema, type Model } from "mongoose";
import { REVERSE_RELATIONS } from "@/models/reverseRelations";

/**
 * Relation discovery.
 *
 * Every foreign key in this schema is stored as a scalar `<relation>Id` field
 * with a `ref`, which is the same convention Prisma used. Mongoose's `populate`
 * wants the *path* name, so we derive `classId -> { path: "class", model: "Class" }`
 * and let the repository translate Prisma's `include: { class: true }` into
 * `populate("class")`.
 *
 * Fields that are already named like the relation (`createdBy`, `uploadedBy`)
 * populate under their own name.
 */

export type RelationInfo = {
  /** Name used in Prisma `include` / `select`. */
  path: string;
  /** Mongoose model name to populate. */
  model: string;
  /** Local scalar field holding the foreign key. */
  localField: string;
  /** True when the FK is required (so populate always resolves). */
  required: boolean;
};

export type Relations = Record<string, RelationInfo>;

/**
 * Define a Mongoose virtual for each `<relation>Id` foreign key so relations
 * can be populated under their Prisma name.
 *
 * The schema stores `classId`; Prisma code says `include: { class: true }`.
 * A virtual named `class` backed by `localField: classId` makes the native
 * `populate("class")` resolve correctly, which a bare `localField` on a
 * non-existent path does not (Mongoose silently returns undefined).
 */
function ensureRelationVirtuals(schema: Schema): void {
  const entries = Object.entries(schema.paths as unknown as Record<string, any>);
  // `schema.virtuals` is also a plain dictionary keyed by virtual name.
  const virtualNames = new Set<string>(
    Object.keys(schema.virtuals as unknown as Record<string, unknown>)
  );

  for (const [name, pathObj] of entries) {
    if (!name.endsWith("Id")) continue;

    const options = (pathObj as any)?.options ?? {};
    const ref = options.ref;
    if (!ref) continue;

    const modelName = Array.isArray(ref) ? ref[0] : ref;
    if (typeof modelName !== "string") continue;

    const base = name.slice(0, -2);
    if (schema.path(base) || virtualNames.has(base)) continue;

    schema.virtual(base, {
      ref: modelName,
      localField: name,
      foreignField: "_id",
      justOne: true,
    });
    virtualNames.add(base);
  }
}

/**
 * Apply the declared reverse (one-to-many / one-to-one back-reference)
 * relations for a model. These are not derivable from the schema because the
 * foreign key lives on the child document.
 */
function ensureReverseVirtuals(schema: Schema, modelName: string): void {
  const list = REVERSE_RELATIONS[modelName];
  if (!list) return;

  const virtualNames = new Set<string>(
    Object.keys(schema.virtuals as unknown as Record<string, unknown>)
  );

  for (const rel of list) {
    if (schema.path(rel.name) || virtualNames.has(rel.name)) continue;

    schema.virtual(rel.name, {
      ref: rel.model,
      localField: "_id",
      foreignField: rel.foreignField,
      justOne: Boolean(rel.one),
    });
    virtualNames.add(rel.name);
  }
}

function buildRelations(schema: Schema, modelName: string): Relations {
  ensureRelationVirtuals(schema);
  ensureReverseVirtuals(schema, modelName);

  const rel: Relations = {};

  // NOTE: `schema.paths` is a plain dictionary, not an array or Map - it has
  // no forEach. Use Object.entries.
  for (const [name, pathObj] of Object.entries(
    schema.paths as unknown as Record<string, any>
  )) {
    const options = (pathObj as any)?.options ?? {};
    const ref = options.ref;

    if (!ref) continue;

    // A ref can be an array of model names; take the first for population.
    const modelName = Array.isArray(ref) ? ref[0] : ref;
    if (typeof modelName !== "string") continue;

    const base = name.endsWith("Id") ? name.slice(0, -2) : name;

    rel[base] = {
      path: base,
      model: modelName,
      localField: name,
      required: Boolean(options.required),
    };
  }

  // Reverse relations are not on the schema, so add them explicitly. Their
  // `localField` is the FK on the CHILD model - that is what `_count`
  // aggregates against on the related collection.
  for (const rev of REVERSE_RELATIONS[modelName] ?? []) {
    rel[rev.name] = {
      path: rev.name,
      model: rev.model,
      localField: rev.foreignField,
      required: false,
    };
  }

  return rel;
}

const cache = new WeakMap<Schema, Relations>();

/** Relations for a model, cached per schema. */
export function getRelations(model: Model<any> | { schema: Schema }): Relations {
  const schema = model.schema as Schema;
  const hit = cache.get(schema);
  if (hit) return hit;

  const modelName =
    (model as Model<any>).modelName ??
    Object.keys(mongoose.models).find((n) => mongoose.models[n].schema === schema) ??
    "";

  const rel = buildRelations(schema, modelName);
  cache.set(schema, rel);
  return rel;
}

/**
 * Expand a Prisma `include` / `select` object into Mongoose populate specs.
 *
 * Returns an ARRAY because Mongoose's nested `populate` field only accepts a
 * string or an array of specs - passing it an object map throws
 * "invalid path. Expected string or array of strings".
 *
 * Prisma:  { student: true }  /  { student: { include: { user: true } } }
 * Result:  [{ path: "student", localField: "userId" }]
 *          [{ path: "class", localField: "classId",
 *             populate: [{ path: "academicSession", localField: "academicSessionId" }] }]
 */
export function toPopulateSpec(
  selection: Record<string, any> | undefined,
  relations: Relations
): Array<Record<string, any>> | undefined {
  if (!selection) return undefined;

  const spec: Array<Record<string, any>> = [];

  for (const [key, value] of Object.entries(selection)) {
    // `_count` is handled separately by an aggregation, not a populate.
    if (key === "_count") continue;

    const info = relations[key];
    if (!info) continue; // Unknown key - not a relation, so ignore.

    if (value === true) {
      spec.push({ path: info.path, localField: info.localField });
      continue;
    }

    if (value === false || value == null) continue;

    if (typeof value === "object") {
      // `{ student: { include: { user: true } } }`
      // The nested keys belong to the RELATED model, so resolve its relations
      // rather than reusing the parent's map.
      const nested = value.include ?? value.select;
      const relatedSchema = mongoose.models[info.model]?.schema;
      const nestedRelations = relatedSchema ? getRelations({ schema: relatedSchema }) : {};
      const nestedSpec = toPopulateSpec(nested, nestedRelations);
      const entry: Record<string, any> = {
        path: info.path,
        localField: info.localField,
      };
      if (nestedSpec) entry.populate = nestedSpec;
      spec.push(entry);
      continue;
    }
  }

  return spec.length > 0 ? spec : undefined;
}

/**
 * Scalar field names requested via Prisma `select`, excluding relation keys.
 * Returns `null` when no scalar projection was requested (meaning "all").
 */
export function scalarSelect(
  selection: Record<string, any> | undefined,
  relations: Relations
): Record<string, 1> | null {
  if (!selection) return null;

  const out: Record<string, 1> = {};
  for (const [key, value] of Object.entries(selection)) {
    if (key === "_count") continue;
    if (key in relations) continue;
    if (value === true) out[key] = 1;
  }

  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Relation names referenced anywhere in a Prisma `where` clause. These are
 * ANDed into the parent filter as `$exists` so populate can still resolve them
 * after the main filter runs.
 */
export function relationsInWhere(where: any, relations: Relations, acc: Set<string> = new Set()): Set<string> {
  if (!where || typeof where !== "object") return acc;

  for (const [key, value] of Object.entries(where)) {
    if (key === "AND" || key === "OR" || key === "NOT") {
      const list = Array.isArray(value) ? value : [value];
      list.forEach((clause: any) => relationsInWhere(clause, relations, acc));
      continue;
    }
    if (relations[key]) acc.add(key);
  }

  return acc;
}