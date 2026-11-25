import { NextResponse } from "next/server";
import { getServerSession, type Session } from "next-auth";
import { authOption } from "@/app/lib/auth";
import type { Role } from "@/lib/enums";

type AuthResult =
  | { ok: true; session: Session }
  | { ok: false; response: NextResponse };

/**
 * Route-handler guard. Returns the session when the caller is signed in and
 * holds one of `roles` (any role when none are given), otherwise a ready-made
 * 401/403 response.
 *
 *   const auth = await requireRole("ADMIN");
 *   if (!auth.ok) return auth.response;
 *   auth.session.user.id
 */
export async function requireRole(...roles: Role[]): Promise<AuthResult> {
  const session = await getServerSession(authOption);

  if (!session?.user?.id) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  if (roles.length > 0 && !roles.includes(session.user.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, session };
}
