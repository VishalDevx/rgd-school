import mongoose, { Schema, type InferSchemaType } from "mongoose";
import { Role } from "@/lib/enums";

/**
 * User + NextAuth collections.
 *
 * MongoDB requires every model to have an `_id`; the old Prisma
 * `VerificationToken` had none (it leaned on `token @unique`), so an explicit
 * `id` is generated here.
 */

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    name: { type: String, required: true },
    role: { type: String, required: true, enum: Object.values(Role), default: Role.STUDENT },
    // Sparse: most students/parents have no phone, and a non-sparse unique
    // index would treat every missing value as null and collide.
    phone: { type: String, unique: true, sparse: true },
    image: { type: String },
    emailVerified: { type: Date },
    adharNo: { type: String, required: true, unique: true },
    lastLogin: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

UserSchema.index({ role: 1 });

const AccountSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, required: true },
    provider: { type: String, required: true },
    providerAccountId: { type: String, required: true },
    refresh_token: { type: String },
    access_token: { type: String },
    expires_at: { type: Number },
    token_type: { type: String },
    scope: { type: String },
    id_token: { type: String },
    session_state: { type: String },
  },
  { timestamps: true }
);

// Required by the NextAuth adapter's getUserByAccount lookup.
AccountSchema.index({ provider: 1, providerAccountId: 1 }, { unique: true });

const SessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    expires: { type: Date, required: true },
    sessionToken: { type: String, required: true, unique: true },
  },
  { timestamps: true }
);

const VerificationTokenSchema = new Schema(
  {
    identifier: { type: String, required: true },
    token: { type: String, required: true, unique: true },
    expires: { type: Date, required: true },
  },
  { timestamps: false }
);

VerificationTokenSchema.index({ identifier: 1, token: 1 }, { unique: true });

export const User = mongoose.models.User || mongoose.model("User", UserSchema);
export const Account = mongoose.models.Account || mongoose.model("Account", AccountSchema);
export const Session = mongoose.models.Session || mongoose.model("Session", SessionSchema);
export const VerificationToken =
  mongoose.models.VerificationToken ||
  mongoose.model("VerificationToken", VerificationTokenSchema);

export type UserDoc = InferSchemaType<typeof UserSchema>;
export type AccountDoc = InferSchemaType<typeof AccountSchema>;
export type SessionDoc = InferSchemaType<typeof SessionSchema>;
export type VerificationTokenDoc = InferSchemaType<typeof VerificationTokenSchema>;