import "server-only";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { CAPABILITY_KEYS, type CapabilityKey } from "@/lib/capabilities-shared";

export { CAPABILITY_KEYS, CAPABILITY_LABELS, type CapabilityKey } from "@/lib/capabilities-shared";

type SessionUser = { id: string; role: string };

// FR-SA-01 short-circuit: no capability check may ever deny Super Admin.
// FR-SA-04: capabilities are resolved from the DB on EVERY request — they are
// never cached in the JWT — so a revoke takes effect on the Admin's next
// request, including in-flight sessions.
export async function hasCapability(user: SessionUser, key: CapabilityKey): Promise<boolean> {
  if (user.role === "SUPER_ADMIN") return true;
  if (user.role !== "ADMIN") return false; // IT and everyone else: never (FR-IT-06)
  const row = await db.adminCapability.findUnique({
    where: { adminUserId_capabilityKey: { adminUserId: user.id, capabilityKey: key } },
    select: { id: true },
  });
  return !!row;
}

// The one reusable server-side guard (FR-PM-02). Throws on denial so server
// actions fail closed; page components should use `hasCapability` + redirect.
// Also fails closed during impersonation — every capability-gated write is
// blocked while a Super Admin is viewing as someone else (FR-SA-06).
export async function requireCapability(key: CapabilityKey) {
  const { assertNotImpersonating } = await import("@/lib/impersonation");
  await assertNotImpersonating();
  const user = await requireUser();
  if (!(await hasCapability(user, key))) {
    throw new Error(`403 — missing capability ${key}`);
  }
  return user;
}

// Full set for the signed-in admin-area user — drives nav rendering (FR-PM-01).
export async function getCapabilitySet(user: SessionUser): Promise<Set<CapabilityKey>> {
  if (user.role === "SUPER_ADMIN") return new Set(CAPABILITY_KEYS);
  if (user.role !== "ADMIN") return new Set();
  const rows = await db.adminCapability.findMany({
    where: { adminUserId: user.id },
    select: { capabilityKey: true },
  });
  return new Set(rows.map((r) => r.capabilityKey as CapabilityKey));
}
