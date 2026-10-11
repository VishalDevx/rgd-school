import type { Adapter, AdapterAccount } from "next-auth/adapters";
import { Account, Session, User, VerificationToken } from "@/models/User";
import { connectDB } from "@/lib/mongodb";

/**
 * NextAuth adapter backed by Mongoose, replacing `@next-auth/prisma-adapter`.
 *
 * The app authenticates with Credentials + JWT, so in practice only
 * `getUser` / `getUserByAccount` are ever hit. The full interface is
 * implemented anyway so an OAuth provider can be added later without rework.
 */

type AnyObj = Record<string, any>;

/**
 * Mongoose's `.lean()` types are a union of the single-doc and many-doc shapes,
 * which fights the Adapter contract's concrete types. Normalising to a plain
 * object keeps the rest of this file readable.
 */
async function one<T = AnyObj>(p: Promise<unknown>): Promise<T | null> {
  const res = await p;
  if (Array.isArray(res)) return (res[0] as T) ?? null;
  return (res as T) ?? null;
}

function withId<T extends AnyObj>(doc: T | null): AnyObj | null {
  if (!doc) return null;
  const { _id, ...rest } = doc;
  return { ...rest, id: String(_id) };
}

export const mongooseAdapter = (): Adapter => ({
  async createUser(data: AnyObj) {
    await connectDB();
    // `role` and `adharNo` are required by the schema for school-specific
    // reasons; OAuth-created users get placeholders an admin must fill in.
    const user = await User.create({
      email: data.email,
      emailVerified: data.emailVerified ?? null,
      name: data.name ?? data.email,
      image: data.image ?? undefined,
      role: "STUDENT",
      adharNo: `OAUTH-${Date.now()}`,
    });
    return withId(user.toObject()) as never;
  },

  async getUser(id) {
    await connectDB();
    return withId(await one(User.findById(String(id)).lean().exec())) as never;
  },

  async getUserByEmail(email) {
    await connectDB();
    return withId(
      await one(User.findOne({ email: email.toLowerCase() }).lean().exec())
    ) as never;
  },

  async getUserByAccount({ provider, providerAccountId }) {
    await connectDB();
    const account = await one(
      Account.findOne({ provider, providerAccountId }).populate("userId").lean().exec()
    );
    if (!account) return null;
    return withId(account.userId) as never;
  },

  async updateUser(data) {
    await connectDB();
    const { id, ...fields } = data as AnyObj;
    const user = await one(
      User.findByIdAndUpdate(String(id), { $set: fields }, { new: true }).lean().exec()
    );
    if (!user) throw new Error("User not found");
    return withId(user) as never;
  },

  async deleteUser(id) {
    await connectDB();
    const user = await one(User.findByIdAndDelete(String(id)).lean().exec());
    if (!user) throw new Error("User not found");
    // Mirror the old `onDelete: Cascade` relations.
    await Session.deleteMany({ userId: user._id }).exec();
    await Account.deleteMany({ userId: user._id }).exec();
    return withId(user) as never;
  },

  async linkAccount(account: AdapterAccount) {
    await connectDB();
    const created = await Account.create(account);
    return created.toObject() as never;
  },

  async unlinkAccount({ provider, providerAccountId }) {
    await connectDB();
    const account = await one(
      Account.findOneAndDelete({ provider, providerAccountId }).lean().exec()
    );
    // The Adapter contract wants `undefined`, not `null`, when nothing matched.
    return (withId(account) ?? undefined) as never;
  },

  async createSession(data) {
    await connectDB();
    const session = await Session.create(data);
    return session.toObject() as never;
  },

  async getSessionAndUser(sessionToken) {
    await connectDB();
    const session = await one(Session.findOne({ sessionToken }).lean().exec());
    if (!session) return null;

    const user = await one(User.findById(session.userId).lean().exec());
    if (!user) return null;

    return { session, user: withId(user) } as never;
  },

  async updateSession(data) {
    await connectDB();
    const { sessionToken, ...fields } = data as AnyObj;
    return (await one(
      Session.findOneAndUpdate({ sessionToken }, { $set: fields }, { new: true }).lean().exec()
    )) as never;
  },

  async deleteSession(sessionToken) {
    await connectDB();
    return (await one(
      Session.findOneAndDelete({ sessionToken }).lean().exec()
    )) as never;
  },

  async createVerificationToken(data) {
    await connectDB();
    const token = await VerificationToken.create(data);
    return token.toObject() as never;
  },

  async useVerificationToken({ identifier, token }) {
    await connectDB();
    return (await one(
      VerificationToken.findOneAndDelete({ identifier, token }).lean().exec()
    )) as never;
  },
});

export default mongooseAdapter;