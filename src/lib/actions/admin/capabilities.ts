"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { CAPABILITY_KEYS, type CapabilityKey } from "@/lib/capabilities";

export type ActionResult = { ok: boolean; error?: string; info?: string };

const schema = z.object({
  adminUserId: z.string().min(1),
  keys: z.array(z.enum(CAPABILITY_KEYS)),
});

// FR-SA-03/05: only Super Admin edits an Admin's capability set. The full
// target set is submitted; grants/revokes are computed as a diff and each is
// audit-logged with before/after values.
export async function saveAdminCapabilities(input: unknown): Promise<ActionResult> {
  const actor = await requireUser();
  if (actor.role !== "SUPER_ADMIN") return { ok: false, error: "Only the Super Admin can grant capabilities" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { adminUserId, keys } = parsed.data;

  const target = await db.user.findFirst({
    where: { id: adminUserId, role: "ADMIN", deletedAt: null },
    select: { id: true, email: true },
  });
  if (!target) return { ok: false, error: "Target is not an active Admin account" };

  const existing = await db.adminCapability.findMany({
    where: { adminUserId },
    select: { capabilityKey: true },
  });
  const before = new Set(existing.map((r) => r.capabilityKey as CapabilityKey));
  const after = new Set(keys);

  const toGrant = keys.filter((k) => !before.has(k));
  const toRevoke = [...before].filter((k) => !after.has(k));

  await db.$transaction([
    ...toGrant.map((capabilityKey) =>
      db.adminCapability.create({ data: { adminUserId, capabilityKey, grantedById: actor.id } })
    ),
    ...toRevoke.map((capabilityKey) =>
      db.adminCapability.delete({
        where: { adminUserId_capabilityKey: { adminUserId, capabilityKey } },
      })
    ),
  ]);

  // FR-SA-05: one immutable audit row per grant and per revoke.
  for (const key of toGrant) {
    await logAudit({
      actorId: actor.id, actorRole: actor.role,
      action: "capability.grant", entity: "AdminCapability", entityId: adminUserId,
      detail: `${key} → ${target.email}`,
      beforeValue: JSON.stringify([...before]), afterValue: JSON.stringify([...after]),
    });
  }
  for (const key of toRevoke) {
    await logAudit({
      actorId: actor.id, actorRole: actor.role,
      action: "capability.revoke", entity: "AdminCapability", entityId: adminUserId,
      detail: `${key} ⨯ ${target.email}`,
      beforeValue: JSON.stringify([...before]), afterValue: JSON.stringify([...after]),
    });
  }

  revalidatePath("/admin/access-control");
  return { ok: true, info: `Saved (${toGrant.length} granted, ${toRevoke.length} revoked)` };
}
