"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { getSessionContext, IMP_COOKIE } from "@/lib/impersonation";
import { homeForRole } from "@/lib/roles";
import { logAudit } from "@/lib/audit";
import type { Role } from "@prisma/client";

export type ActionResult = { ok: boolean; error?: string };

// FR-SA-06: start impersonating a user (read-only). Super Admin only; audited.
export async function startImpersonation(targetUserId: string): Promise<ActionResult> {
  const actor = await requireUser();
  if (actor.role !== "SUPER_ADMIN") return { ok: false, error: "Only the Super Admin can impersonate" };

  const target = await db.user.findFirst({
    where: { id: targetUserId, deletedAt: null, role: { not: "SUPER_ADMIN" } },
    select: { id: true, email: true, role: true },
  });
  if (!target) return { ok: false, error: "User not available for impersonation" };

  (await cookies()).set(IMP_COOKIE, target.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60, // 1 hour safety cap
  });

  await logAudit({
    actorId: actor.id, actorRole: actor.role, action: "impersonation.start",
    entity: "User", entityId: target.id, detail: `${target.role} ${target.email}`,
  });

  redirect(homeForRole(target.role as Role));
}

// End impersonation and return to the Super Admin's own area.
export async function stopImpersonation(): Promise<void> {
  const ctx = await getSessionContext();
  const jar = await cookies();
  if (ctx?.impersonating && ctx.realUser) {
    await logAudit({
      actorId: ctx.realUser.id, actorRole: ctx.realUser.role, action: "impersonation.end",
      entity: "User", entityId: ctx.user.id,
    });
  }
  // Expire the cookie explicitly (path must match how it was set).
  jar.set(IMP_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
  redirect("/admin/users");
}
