// lib/auth.ts
import { mongooseAdapter } from "@/lib/auth-adapter";
import { db } from "@/lib/db";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { type AuthOptions } from "next-auth";
import { clearLoginFailures, isLoginBlocked, recordLoginFailure } from "./rateLimit";

if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("Missing NEXTAUTH_SECRET in env");
}

export const authOption: AuthOptions = {
  adapter: mongooseAdapter(),

  session: {
    strategy: "jwt", // <- database sessions allow multiple logins in the same browser
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  providers: [
    // Admin & Staff login
    Credentials({
      id: "email-password",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const { email, password } = credentials ?? {};
        if (!email || !password) throw new Error("Missing credentials");

        const identifier = email.toLowerCase().trim();
        const blocked = await isLoginBlocked({ req, identifier });
        if (blocked.blocked) {
          throw new Error(`Too many login attempts. Try again in ${blocked.retryAfterSeconds}s.`);
        }

        const user = await db.user.findUnique({ where: { email: identifier } });

        if (!user) {
          await recordLoginFailure({ req, identifier });
          throw new Error("Invalid credentials");
        }
        if (!user.passwordHash) {
          await recordLoginFailure({ req, identifier });
          throw new Error("Invalid credentials");
        }
        if (!["ADMIN", "STAFF"].includes(user.role)) {
          await recordLoginFailure({ req, identifier });
          throw new Error("Unauthorized role");
        }

        if (!user.isActive) {
          await recordLoginFailure({ req, identifier });
          throw new Error("Account is deactivated. Contact admin.");
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          await recordLoginFailure({ req, identifier });
          throw new Error("Invalid credentials");
        }

        await clearLoginFailures({ req, identifier });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),

    // Student login
    Credentials({
      id: "student-login",
      name: "Student Login",
      credentials: {
        aadharNo: { label: "Aadhar Number", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        const { aadharNo, password } = credentials ?? {};
        if (!aadharNo || !password) throw new Error("Missing credentials");

        const identifier = aadharNo.trim();
        const blocked = await isLoginBlocked({ req, identifier });
        if (blocked.blocked) {
          throw new Error(`Too many login attempts. Try again in ${blocked.retryAfterSeconds}s.`);
        }

        const user = await db.user.findUnique({
          where: { adharNo: identifier },
        });

        if (!user) {
          await recordLoginFailure({ req, identifier });
          throw new Error("Invalid credentials");
        }
        if (user.role !== "STUDENT") {
          await recordLoginFailure({ req, identifier });
          throw new Error("Unauthorized role");
        }
        if (!user.passwordHash) {
          await recordLoginFailure({ req, identifier });
          throw new Error("Invalid credentials");
        }

        if (!user.isActive) {
          await recordLoginFailure({ req, identifier });
          throw new Error("Account is deactivated. Contact admin.");
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          await recordLoginFailure({ req, identifier });
          throw new Error("Invalid credentials");
        }

        await clearLoginFailures({ req, identifier });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],

  pages: {
    signIn: "/login",
  },

  secret: process.env.NEXTAUTH_SECRET,

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role;
      }
      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      if (url.startsWith(baseUrl)) return url;
      return baseUrl;
    },
  },
}