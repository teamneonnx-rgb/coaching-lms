import "server-only";
import { db } from "@/lib/db";

// Append an immutable audit entry (FR-ADM-6, NFR-S6). Best-effort — never
// throws into the caller's happy path.
export async function logAudit(input: {
  actorId?: string | null;
  actorRole?: string | null;
  action: string; // e.g. "user.delete"
  entity: string; // e.g. "User"
  entityId?: string | null;
  detail?: string | null;
}): Promise<void> {
  try {
    await db.auditEntry.create({
      data: {
        actorId: input.actorId ?? null,
        actorRole: input.actorRole ?? null,
        action: input.action,
        entity: input.entity,
        entityId: input.entityId ?? null,
        detail: input.detail ?? null,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write entry", err);
  }
}
