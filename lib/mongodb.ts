import mongoose from "mongoose";

/**
 * MongoDB connection singleton.
 *
 * Mirrors the old `lib/prisma.ts` pattern so hot-reload in dev does not open a
 * new pool on every edit. In production the connection is created once per
 * serverless instance.
 */

// The env check is deliberately deferred to connectDB() rather than run at
// module load. Many modules import this file transitively, and throwing during
// import would break `next build` (which does not always have the runtime env).
const requireUri = (): string => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error(
      "Missing MONGODB_URI in env. Set it in .env, e.g.\n" +
        '  MONGODB_URI="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/rgd_school?appName=Cluster0"'
    );
  }
  if (uri.includes("<db_password>") || uri.includes("<password>")) {
    throw new Error(
      "MONGODB_URI still contains the literal <db_password> placeholder. " +
        "Replace it with the real MongoDB Atlas password."
    );
  }
  return uri;
};

// Never let a bad filter silently turn into a full collection scan.
mongoose.set("strictQuery", true);

// NOTE: `sanitizeFilter` is deliberately OFF. It rewrites legitimate
// operators like `{ $in: [...] }` into `{ $eq: { $in: [...] } }`, which then
// fails to cast (e.g. against ObjectId fields). Operator-injection protection
// is handled precisely in `lib/db/query.ts`, which only emits operators it
// recognises and drops any caller-supplied `$`-prefixed key.

// Foreign keys are stored as `<relation>Id` scalars, and the repository
// populates them under the relation name (`include: { user: true }` ->
// populate path "user" reading localField "userId"). `user` is not a declared
// path, so Mongoose's strictPopulate guard would reject it. The populate paths
// are always derived from real schema `ref`s rather than user input, so the
// guard has nothing to catch here.
mongoose.set("strictPopulate", false);

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalForMongoose = globalThis as unknown as { __mongooseCache?: MongooseCache };

const cache: MongooseCache = globalForMongoose.__mongooseCache ?? {
  conn: null,
  promise: null,
};
globalForMongoose.__mongooseCache = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(requireUri(), {
        bufferCommands: false,
        // Atlas free tier (M0) is a single-node replica set, so we must not ask
        // for a transaction-capable topology check that it cannot satisfy.
        serverSelectionTimeoutMS: 10000,
        maxPoolSize: 5,
      })
      .then((m) => m)
      .catch((err) => {
        // Reset the cached promise so a later request can retry instead of
        // replaying the rejection forever.
        cache.promise = null;
        throw err;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

export async function disconnectDB(): Promise<void> {
  if (!cache.promise) return;
  await mongoose.disconnect();
  cache.conn = null;
  cache.promise = null;
}

export default connectDB;