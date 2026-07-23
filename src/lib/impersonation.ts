import "server-only";
import { cookies } from "next/headers";
import type { Role } from "@prisma/client";
import { auth } from "@/auth";
import { db } from "@/lib/db";

export const IMP_COOKIE = "imp_uid";

// FR-SA-06: Super Admin can view any role's dashboard read-only. The target
// user id is kept in an httpOnly cookie; it only takes effect when the REAL
// session is the Super Admin, so it can't be forged by anyone else.
export type EffectiveUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: Role;
};

export type SessionContext = {
  user: EffectiveUser; // effective (target during impersonation, else real)
  realUser: EffectiveUser | null;
  impersonating: boolean;
};

export async function getSessionContext(): Promise<SessionContext | null> {
  const session = await auth();
  if (!session?.user) return null;
  const real: EffectiveUser = {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role as Role,
  };

  if (real.role !== "SUPER_ADMIN") {
    return { user: real, realUser: real, impersonating: false };
  }

  const targetId = (await cookies()).get(IMP_COOKIE)?.value;
  if (!targetId) return { user: real, realUser: real, impersonating: false };

  const target = await db.user.findFirst({
    where: { id: targetId, deletedAt: null, role: { not: "SUPER_ADMIN" } },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!target) return { user: real, realUser: real, impersonating: false };

  return { user: target as EffectiveUser, realUser: real, impersonating: true };
}

// True when the current request is an in-progress impersonation. Used by the
// write-block so no mutation ever runs under an impersonated identity.
export async function isImpersonating(): Promise<boolean> {
  const ctx = await getSessionContext();
  return ctx?.impersonating ?? false;
}

export async function assertNotImpersonating(): Promise<void> {
  if (await isImpersonating()) {
    throw new Error("Impersonation is read-only — stop impersonating to make changes");
  }
}
