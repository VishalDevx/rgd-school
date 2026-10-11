import type { Model } from "mongoose";
import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { getRelations, relationsInWhere, scalarSelect, toPopulateSpec, type Relations } from "./relations";
import { toMongoFilter, toMongoSort, toSkipTake } from "./query";

type AnyObj = Record<string, any>;

function isPlainObject(v: unknown): v is AnyObj {
  return typeof v === "object" && v !== null && !Array.isArray(v) && !(v instanceof Date);
}

/** Prisma's `id` is Mongoose's `_id`. */
const ID_ALIASES: Record<string, string> = { id: "_id" };

/**
 * A thin repository that keeps the Prisma-shaped call API used across the app
 * (`findMany({ where, include, orderBy, take, skip })`) while executing against
 * MongoDB via Mongoose.
 *
 * Prisma is removed; this layer exists purely so the ~120 route files stay
 * readable instead of being rewritten into raw Mongoose queries.
 */
export class Repository {
  constructor(
    private readonly model: Model<any>,
    readonly name: string
  ) {}

  private get relations(): Relations {
    return getRelations(this.model);
  }

  /**
   * Await the connection before touching the driver.
   *
   * Mongoose is configured with `bufferCommands: false` so a query issued
   * before the connection opens fails loudly instead of hanging forever. That
   * means every operation has to make sure the socket is up first.
   */
  private async ensure(): Promise<void> {
    if (mongoose.connection.readyState === 1) return;
    await connectDB();
  }

  // ---------------------------------------------------------------- helpers

  /** Strip Prisma `id` -> `_id` and drop relation keys from a where clause. */
  private normalizeWhereKeys(where: AnyObj): AnyObj {
    if (!where) return {};
    const out: AnyObj = {};
    for (const [k, v] of Object.entries(where)) {
      if (v === undefined) continue;
      const key = ID_ALIASES[k] ?? k;
      if (key === "_id" && isPlainObject(v)) {
        // Compound unique key handled separately.
        out[k] = v;
        continue;
      }
      if (isPlainObject(v) && !Array.isArray(v)) {
        out[key] = this.normalizeWhereKeys(v);
      } else {
        out[key] = v;
      }
    }
    return out;
  }

  /**
   * Expand Prisma compound-unique keys (`{ studentId_date: { studentId, date } }`)
   * into a flat filter. Names are derived the same way Prisma derives them:
   * the index fields joined with `_`.
   */
  private compoundKeyMap(): Record<string, string[]> {
    const map: Record<string, string[]> = {};
    for (const spec of this.model.schema.indexes()) {
      // Mongoose returns compound index fields as a flat array
      // (["studentId", 1]) rather than an object, so Object.keys() would yield
      // ["0", "1"]. Normalise both shapes.
      const fields = Array.isArray(spec[0])
        ? (spec[0] as unknown[]).map((f) => String(f))
        : Object.keys(spec[0] as Record<string, unknown>);
      if (fields.length < 2) continue;
      map[fields.join("_")] = fields;
    }
    return map;
  }

  /** Flatten compound unique keys in a where clause. */
  private expandCompoundKeys(where: AnyObj): AnyObj {
    if (!where) return {};
    const compounds = this.compoundKeyMap();
    const out: AnyObj = {};
    for (const [k, v] of Object.entries(where)) {
      if (compounds[k] && isPlainObject(v)) {
        for (const field of compounds[k]) {
          const val = v[field];
          if (val === undefined) continue;
          out[ID_ALIASES[field] ?? field] = val;
        }
        continue;
      }
      out[k] = v;
    }
    return out;
  }

  /**
   * Pull relation filters out of a where clause and resolve them to a set of
   * foreign ids via a second query, then AND that id list onto the parent.
   *
   * This is how MongoDB replaces a SQL JOIN in a WHERE clause, e.g.
   * `where: { student: { classId } }` becomes
   * `where: { studentId: { $in: [<matching student ids>] } }`.
   */
  private async resolveRelationFilters(where: AnyObj): Promise<AnyObj> {
    const relations = this.relations;
    const flat = this.normalizeWhereKeys(where);

    const relationKeys = [...relationsInWhere(flat, relations)].filter((key) => {
      const val = (flat as AnyObj)[key];
      return val !== undefined && val !== null && isPlainObject(val);
    });

    if (relationKeys.length === 0) return flat;

    const resolved: AnyObj = { ...flat };

    for (const key of relationKeys) {
      const info = relations[key];
      const relatedModel = mongoose.models[info.model];
      if (!relatedModel) {
        delete resolved[key];
        continue;
      }

      const nested = this.normalizeWhereKeys(flat[key]);
      const nestedRelations = getRelations(relatedModel);
      const nestedRelKeys = [...relationsInWhere(nested, nestedRelations)];

      // Only one level of relation nesting is supported; strip deeper ones.
      const cleanedNested: AnyObj = {};
      for (const [nk, nv] of Object.entries(nested)) {
        if (nestedRelKeys.includes(nk)) continue;
        cleanedNested[nk] = nv;
      }

      const ids = await relatedModel
        .find(toMongoFilter(cleanedNested, []))
        .select("_id")
        .lean();

      const idValues = ids.map((d: AnyObj) => d._id);

      // Combine with any existing filter on the same FK with AND semantics.
      const fk = info.localField;
      const existing = resolved[fk];
      if (existing && isPlainObject(existing) && Object.keys(existing).length > 0) {
        resolved[fk] = { $and: [existing, { $in: idValues }] };
      } else {
        resolved[fk] = { $in: idValues };
      }

      delete resolved[key];
    }

    return resolved;
  }

  /**
   * Mongoose's `populate()` handles ONE path spec per call - it does not
   * accept a map of `{ path: spec }`. Chain one call per relation.
   */
  private static applyPopulate<T>(query: T, specs: Array<Record<string, any>>): T {
    let q = query as any;
    for (const spec of specs) {
      q = q.populate(spec);
    }
    return q as T;
  }

  /** Build the populate spec from Prisma `include` / `select`. */
  private buildPopulate(args: AnyObj): Array<Record<string, any>> | undefined {
    const source = args.include ?? args.select;
    if (!source) return undefined;

    const relations = this.relations;
    const specs = toPopulateSpec(source, relations);
    if (!specs) return undefined;

    // Attach nested `where` / `orderBy` / `take` / `skip` to each populated path.
    for (const [key, value] of Object.entries(source)) {
      if (key === "_count") continue;
      const info = relations[key];
      if (!info) continue;
      const entry = specs.find((e) => e.path === info.path);
      if (!entry || !isPlainObject(value)) continue;

      if (value.where) {
        entry.match = toMongoFilter(this.normalizeWhereKeys(value.where), []);
      }
      const sort = toMongoSort(value.orderBy);
      if (sort) {
        entry.options = { ...(entry.options ?? {}), sort };
      }
      if (typeof value.take === "number") {
        entry.options = { ...(entry.options ?? {}), limit: value.take };
      }
      if (typeof value.skip === "number") {
        entry.options = { ...(entry.options ?? {}), skip: value.skip };
      }
    }

    return specs;
  }

  /** Scalar projection from Prisma `select` (no `include`). */
  private buildProjection(args: AnyObj): Record<string, 1> | null {
    if (args.include) return null; // `include` returns all scalars
    const scalars = scalarSelect(args.select, this.relations);
    if (!scalars) return null;
    const out: Record<string, 1> = {};
    for (const [k, v] of Object.entries(scalars)) out[ID_ALIASES[k] ?? k] = v;

    // Mongoose drops `_id` as soon as a projection is set. Always keep it: it
    // backs the `id` field and is the key `_count` aggregates against.
    out._id = 1;

    // A relation being populated needs its foreign key present in the
    // projection, otherwise `populate` has nothing to resolve against and the
    // relation comes back undefined.
    const source = args.select ?? {};
    const relations = this.relations;
    for (const key of Object.keys(source)) {
      if (key === "_count") continue;
      const info = relations[key];
      if (!info) continue;
      const fk = info.localField;
      out[fk] = 1;
    }

    return out;
  }

  /**
   * Normalise a lean document into the shape Prisma returned:
   * `_id` is renamed to `id` and every ObjectId is stringified.
   *
   * The stringification matters because Prisma IDs were always strings - route
   * code does string comparisons, URL building and `ObjectId(value)` casting.
   * Mongoose casts a hex string back to ObjectId when querying, so no query
   * behaviour changes.
   */
  private static normalizeDoc<T = AnyObj>(doc: AnyObj | null | undefined): any {
    if (!doc || typeof doc !== "object") return doc;
    if (Array.isArray(doc)) return doc.map((d) => Repository.normalizeDoc(d));
    if (doc instanceof Date) return doc;

    const { _id, ...rest } = doc as AnyObj;
    const out: AnyObj = {};
    if (_id !== undefined) out.id = String(_id);

    for (const [k, v] of Object.entries(rest)) {
      if (v instanceof mongoose.Types.ObjectId) out[k] = v.toString();
      else if (Array.isArray(v)) out[k] = v.map((item) => Repository.normalizeDoc(item));
      else if (isPlainObject(v)) out[k] = Repository.normalizeDoc(v);
      else out[k] = v;
    }
    return out;
  }

  /**
   * Attach `_count` to each row using a grouped aggregation against the related
   * collection, mirroring Prisma's `include: { _count: { select: { x: true } } }`.
   */
  private async attachCounts(docs: AnyObj[], countSpec: AnyObj): Promise<AnyObj[]> {
    if (docs.length === 0) return docs;

    const relations = this.relations;
    const requested: Array<{ key: string; info: (typeof relations)[string] }> = [];

    const collect = (spec: any) => {
      if (spec === true) {
        // `_count: true` counts every relation on the model.
        for (const [key, info] of Object.entries(relations)) requested.push({ key, info });
        return;
      }
      if (!isPlainObject(spec)) return;
      const inner = spec.select ?? spec.include ?? spec;
      for (const [key, enabled] of Object.entries(inner)) {
        if (!enabled) continue;
        const info = relations[key];
        if (info) requested.push({ key, info });
      }
    };

    collect(countSpec);

    if (requested.length === 0) {
      for (const doc of docs) doc._count = {};
      return docs;
    }

    const docIds = docs.map((d) => d._id ?? d.id).filter(Boolean);

    await Promise.all(
      requested.map(async ({ key, info }) => {
        const relatedModel = mongoose.models[info.model];
        if (!relatedModel) return;

        // The parent's FK for this relation lives in the related collection.
        const rows = await relatedModel
          .aggregate([
            { $match: { [info.localField]: { $in: docIds } } },
            { $group: { _id: `$${info.localField}`, n: { $sum: 1 } } },
          ])
          .exec();

        const byId = new Map<string, number>();
        for (const row of rows) byId.set(String(row._id), row.n);

        for (const doc of docs) {
          const id = String(doc._id ?? doc.id);
          if (!doc._count) doc._count = {};
          doc._count[key] = byId.get(id) ?? 0;
        }
      })
    );

    return docs;
  }

  /** Pull `_count` out of args and note that it was requested. */
  private takeCountSpec(args: AnyObj): AnyObj | undefined {
    const source = args.include ?? args.select;
    if (!source) return undefined;
    if (source._count === undefined) return undefined;
    return source._count;
  }

  // ------------------------------------------------------------- read ops

  async findMany(args: AnyObj = {}): Promise<any[]> {
    await this.ensure();
    const where = await this.resolveRelationFilters(args.where ?? {});
    const countSpec = this.takeCountSpec(args);

    let q = this.model.find(toMongoFilter(where, []), ID_ALIASES.id ? undefined : undefined);

    const sort = toMongoSort(args.orderBy);
    if (sort) q = q.sort(sort);

    const { skip, limit } = toSkipTake(args);
    if (skip !== undefined) q = q.skip(skip);
    if (limit !== undefined) q = q.limit(limit);

    const projection = this.buildProjection(args);
    if (projection) q = q.select(projection);

    const populate = this.buildPopulate(args);
    if (populate) q = Repository.applyPopulate(q, populate);

    const docs = await q.lean().exec();
    // Attach counts while `_id` is still an ObjectId - the aggregation $match
    // compares against ObjectId, not the string `id` the normalized doc carries.
    if (countSpec) await this.attachCounts(docs as AnyObj[], countSpec);
    const normalized = (docs as AnyObj[]).map((d) => Repository.normalizeDoc(d));
    return normalized;
  }

  async findFirst(args: AnyObj = {}): Promise<any> {
    const rows = await this.findMany({ ...args, take: 1 });
    return rows[0] ?? null;
  }

  async findFirstOrThrow(args: AnyObj = {}): Promise<any> {
    const row = await this.findFirst(args);
    if (!row) {
      throw new Error(`${this.name}: No record found for findFirstOrThrow`);
    }
    return row;
  }

  async findUnique(args: AnyObj = {}): Promise<any> {
    await this.ensure();
    // Prisma allows a compound key in `where`; flatten before building.
    const where = this.expandCompoundKeys(args.where ?? {});
    const resolved = await this.resolveRelationFilters(where);

    const q = this.model.findOne(toMongoFilter(resolved, []));
    const populate = this.buildPopulate(args);
    if (populate) Repository.applyPopulate(q, populate);

    const projection = this.buildProjection(args);
    if (projection) q.select(projection);

    const doc = await q.lean().exec();
    return doc ? Repository.normalizeDoc(doc) : null;
  }

  async findUniqueOrThrow(args: AnyObj = {}): Promise<any> {
    const row = await this.findUnique(args);
    if (!row) {
      throw new Error(`${this.name}: No record found for findUniqueOrThrow`);
    }
    return row;
  }

  async count(args: AnyObj = {}): Promise<number> {
    await this.ensure();
    const where = await this.resolveRelationFilters(args.where ?? {});
    return this.model.countDocuments(toMongoFilter(where, [])).exec();
  }

  /** Prisma-style `_sum` / `_avg` / `_min` / `_max` / `_count` aggregation. */
  async aggregate(args: AnyObj = {}): Promise<AnyObj> {
    await this.ensure();
    const where = await this.resolveRelationFilters(args.where ?? {});
    const match = toMongoFilter(where, []);

    const groupId = args.by === undefined ? null : undefined;

    // `$group` accumulator keys must be plain identifiers on this server -
    // both `{ $group: { _sum: {...} } }` and `{ $group: { $sum: ... } }` are
    // rejected. Each requested field therefore gets a synthetic output key
    // that is renamed back into Prisma's `_sum.amount` shape afterwards.
    const acc: AnyObj = {};
    const keyMap: Array<[string, string, string]> = []; // [op, field, mongoKey]
    let seq = 0;

    const addField = (fields: AnyObj | boolean | undefined, op: string) => {
      if (fields === undefined) return;
      if (!isPlainObject(fields)) return;
      for (const [field, enabled] of Object.entries(fields)) {
        if (!enabled) continue;
        const key = `__agg_${seq++}`;
        acc[key] = { [op]: `$${field}` };
        keyMap.push([op, field, key]);
      }
    };

    addField(args._sum, "$sum");
    addField(args._avg, "$avg");
    addField(args._min, "$min");
    addField(args._max, "$max");

    const pipeline: AnyObj[] = [];
    if (Object.keys(match).length > 0) pipeline.push({ $match: match });

    const result: AnyObj = {};

    if (args._count !== undefined) {
      pipeline.push({ $group: { _id: groupId, n: { $sum: 1 } } });
      const rows: AnyObj[] = await this.model.aggregate(pipeline as any).exec();
      result._count = rows[0]?.n ?? 0;
    } else if (keyMap.length > 0) {
      pipeline.push({ $group: { _id: groupId, ...acc } });
      const rows: AnyObj[] = await this.model.aggregate(pipeline as any).exec();
      const row = rows[0] ?? {};
      for (const [op, field, key] of keyMap) {
        const name = `_${op.slice(1)}`; // $sum -> _sum
        (result[name] ??= {})[field] = row[key] ?? null;
      }
    }

    return result;
  }

  // ------------------------------------------------------------ write ops

  private cleanData(data: AnyObj): AnyObj {
    const out: AnyObj = {};
    for (const [k, v] of Object.entries(data ?? {})) {
      if (v === undefined) continue;
      out[ID_ALIASES[k] ?? k] = v;
    }
    return out;
  }

  private async applyPopulate(
    idValue: any,
    args: AnyObj,
    mode: "read" | "update" | "delete"
  ): Promise<any> {
    const populate = this.buildPopulate(args);
    if (!populate || !idValue) return null;

    let q: any = this.model.findById(idValue);
    if (mode === "update") {
      // Caller passes the updated doc separately; kept for symmetry.
    }
    q = Repository.applyPopulate(q, populate);
    const doc = await q.lean().exec();
    return doc ? Repository.normalizeDoc(doc) : null;
  }

  async create(args: AnyObj): Promise<any> {
    await this.ensure();
    const doc = await this.model.create(this.cleanData(args.data));
    const plain = doc.toObject();
    const normalized = Repository.normalizeDoc(plain);

    const populate = this.buildPopulate(args);
    if (populate && normalized?.id) {
      const reloaded = await this.applyPopulate(normalized.id, args, "read");
      if (reloaded) return reloaded;
    }
    return normalized;
  }

  async createMany(args: AnyObj): Promise<{ count: number }> {
    await this.ensure();
    if (args.skipDuplicates) {
      throw new Error(
        `${this.name}.createMany: skipDuplicates is not supported on MongoDB. ` +
          `Filter the rows first, or catch the duplicate-key error.`
      );
    }
    const rows = (Array.isArray(args.data) ? args.data : [args.data]).map((d: AnyObj) =>
      this.cleanData(d)
    );
    if (rows.length === 0) return { count: 0 };
    const inserted = await this.model.insertMany(rows, { ordered: true });
    return { count: inserted.length };
  }

  async update(args: AnyObj): Promise<any> {
    await this.ensure();
    const where = this.expandCompoundKeys(args.where ?? {});
    const filter = toMongoFilter(this.normalizeWhereKeys(where), []);

    const doc = await this.model
      .findOneAndUpdate(filter, { $set: this.cleanData(args.data) }, { new: true })
      .lean()
      .exec();

    if (!doc) throw new Error(`${this.name}: No record found for update`);
    return Repository.normalizeDoc(doc);
  }

  async updateMany(args: AnyObj): Promise<{ count: number }> {
    await this.ensure();
    const where = await this.resolveRelationFilters(args.where ?? {});
    const filter = toMongoFilter(where, []);
    const res = await this.model.updateMany(filter, { $set: this.cleanData(args.data) }).exec();
    return { count: res.modifiedCount ?? 0 };
  }

  async upsert(args: AnyObj): Promise<any> {
    await this.ensure();
    const where = this.expandCompoundKeys(args.where ?? {});
    const filter = toMongoFilter(this.normalizeWhereKeys(where), []);

    // `$setOnInsert` and `$set` must not overlap, or Mongo rejects the update
    // with ConflictingUpdateOperators ("Updating the path 'x' would create a
    // conflict"). Fields already in `$set` apply on insert too, so drop the
    // duplicates from the create payload.
    const setData = this.cleanData(args.update ?? {});
    const onInsert: AnyObj = {};
    for (const [k, v] of Object.entries(this.cleanData(args.create ?? {}))) {
      if (k in setData) continue;
      onInsert[k] = v;
    }

    const doc = await this.model
      .findOneAndUpdate(filter, { $set: setData, $setOnInsert: onInsert }, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      })
      .lean()
      .exec();

    return doc ? Repository.normalizeDoc(doc) : null;
  }

  async delete(args: AnyObj): Promise<any> {
    await this.ensure();
    const where = this.expandCompoundKeys(args.where ?? {});
    const filter = toMongoFilter(this.normalizeWhereKeys(where), []);

    const doc = await this.model.findOneAndDelete(filter).lean().exec();
    if (!doc) throw new Error(`${this.name}: No record found for delete`);
    return Repository.normalizeDoc(doc);
  }

  async deleteMany(args: AnyObj = {}): Promise<{ count: number }> {
    await this.ensure();
    const where = await this.resolveRelationFilters(args.where ?? {});
    const res = await this.model.deleteMany(toMongoFilter(where, [])).exec();
    return { count: res.deletedCount ?? 0 };
  }

  /** Escape hatch for the rare call site that needs the raw model. */
  get raw(): Model<any> {
    return this.model;
  }
}