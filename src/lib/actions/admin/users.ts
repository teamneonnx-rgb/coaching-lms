"use server";

import { revalidatePath } from "next/cache";
import { Prisma, type Role } from "@prisma/client";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { hasCapability } from "@/lib/capabilities";
import { sendWelcomeEmail } from "@/lib/notifications/events";
import { linkParentForStudent } from "@/lib/parent";
import { logAudit } from "@/lib/audit";
import {
  adminCreateUserSchema,
  adminUpdateUserSchema,
} from "@/lib/validations/admin";

export type ActionResult = { ok: boolean; error?: string; info?: string };

const BCRYPT_ROUNDS = 12; // FR-AUTH-03

// Capability routing for account management (FR-SA-02, FR-PM-01/02):
// TEACHER accounts   → TEACHER_MANAGE
// STUDENT/PARENT     → STUDENT_MANAGE (parents ride on their ward's lifecycle)
// ADMIN / IT         → Super Admin only (FR-SA-02)
// SUPER_ADMIN        → never creatable (singleton, FR-SA-00 — transfer only)
async function assertCanManageAccount(targetRole: Role) {
  const actor = await requireUser();
  if (targetRole === "SUPER_ADMIN") throw new Error("Super Admin is a single-person role — it can only be transferred");
  if (actor.role === "SUPER_ADMIN") return actor;
  if (actor.role !== "ADMIN") throw new Error("403 — not authorized");
  if (targetRole === "ADMIN" || targetRole === "IT") {
    throw new Error("Only the Super Admin can manage Admin and IT accounts");
  }
  const key = targetRole === "TEACHER" ? "TEACHER_MANAGE" : "STUDENT_MANAGE";
  if (!(await hasCapability(actor, key))) throw new Error(`403 — missing capability ${key}`);
  return actor;
}

export async function createUser(values: unknown): Promise<ActionResult> {
  const parsed = adminCreateUserSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const data = parsed.data;

  let actor;
  try {
    actor = await assertCanManageAccount(data.role);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Not authorized" };
  }

  const email = data.email.toLowerCase();
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "Email already in use" };

  const password = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  // New users inherit the creating admin's institute (multi-tenancy).
  const actorRecord = await db.user.findUnique({
    where: { id: actor.id },
    select: { instituteId: true },
  });

  const created = await db.user.create({
    data: {
      name: data.name,
      email,
      password,
      role: data.role,
      instituteId: actorRecord?.instituteId ?? null,
      createdById: actor.id,
      mustChangePassword: true, // FR-AU-02 — forced change on first login
      parentName: data.parentName || null,
      parentPhone: data.parentPhone || null,
      parentEmail: data.parentEmail || null,
    },
    select: { id: true },
  });

  // FR-PAR-1: auto-provision + link a Parent account for new students.
  if (data.role === "STUDENT" && data.parentEmail) {
    await linkParentForStudent({
      studentId: created.id,
      studentName: data.name,
      parentName: data.parentName,
      parentEmail: data.parentEmail,
      instituteId: actorRecord?.instituteId ?? null,
    });
  }

  await sendWelcomeEmail(email, data.name); // FR-NT-02 account created
  await logAudit({
    actorId: actor.id, actorRole: actor.role, action: "user.create", entity: "User",
    entityId: created.id, detail: `${data.role} ${email}`,
    afterValue: JSON.stringify({ name: data.name, email, role: data.role }),
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateUser(values: unknown): Promise<ActionResult> {
  const parsed = adminUpdateUserSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const data = parsed.data;

  const before = await db.user.findUnique({
    where: { id: data.id },
    select: { name: true, email: true, role: true },
  });
  if (!before) return { ok: false, error: "User not found" };
  if (before.role === "SUPER_ADMIN") return { ok: false, error: "The Super Admin account cannot be edited here" };

  // Must be allowed to manage BOTH the current and the target role.
  let actor;
  try {
    actor = await assertCanManageAccount(before.role);
    if (data.role !== before.role) await assertCanManageAccount(data.role);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Not authorized" };
  }

  const email = data.email.toLowerCase();
  const clash = await db.user.findFirst({
    where: { email, NOT: { id: data.id } },
    select: { id: true },
  });
  if (clash) return { ok: false, error: "Email already in use" };

  const updateData: Prisma.UserUpdateInput = {
    name: data.name,
    email,
    role: data.role,
    parentName: data.parentName || null,
    parentPhone: data.parentPhone || null,
    parentEmail: data.parentEmail || null,
  };
  if (data.password && data.password.length > 0) {
    updateData.password = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
    updateData.mustChangePassword = true;
  }

  await db.user.update({ where: { id: data.id }, data: updateData });
  await logAudit({
    actorId: actor.id, actorRole: actor.role, action: "user.update", entity: "User",
    entityId: data.id,
    beforeValue: JSON.stringify(before),
    afterValue: JSON.stringify({ name: data.name, email, role: data.role }),
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteUser(id: string): Promise<ActionResult> {
  if (!id) return { ok: false, error: "Missing user id" };
  const target = await db.user.findUnique({ where: { id }, select: { email: true, role: true } });
  if (!target) return { ok: false, error: "User not found" };
  if (target.role === "SUPER_ADMIN") return { ok: false, error: "The Super Admin account cannot be deleted" };

  let admin;
  try {
    admin = await assertCanManageAccount(target.role);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Not authorized" };
  }
  if (id === admin.id) return { ok: false, error: "You cannot delete your own account" };

  // Soft delete — reversible from the recycle bin.
  await db.user.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: admin.id },
  });

  await logAudit({
    actorId: admin.id, actorRole: admin.role, action: "user.delete", entity: "User",
    entityId: id, detail: `${target.role} ${target.email}`,
    beforeValue: JSON.stringify(target),
  });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { ok: true };
}

export async function restoreUser(id: string): Promise<ActionResult> {
  const target = await db.user.findUnique({ where: { id }, select: { role: true } });
  if (!target) return { ok: false, error: "User not found" };
  let admin;
  try {
    admin = await assertCanManageAccount(target.role);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Not authorized" };
  }
  await db.user.update({ where: { id }, data: { deletedAt: null, deletedById: null } });
  await logAudit({ actorId: admin.id, actorRole: admin.role, action: "user.restore", entity: "User", entityId: id });
  revalidatePath("/admin/users");
  revalidatePath("/admin/recycle-bin");
  return { ok: true };
}

// FR-AU-03 (admin path): reset another user's password. Requires the
// PASSWORD_RESET capability; the account is forced to change it on next login.
export async function resetUserPassword(id: string): Promise<ActionResult & { tempPassword?: string }> {
  const actor = await requireUser();
  if (!(await hasCapability(actor, "PASSWORD_RESET"))) {
    return { ok: false, error: "403 — missing capability PASSWORD_RESET" };
  }
  const target = await db.user.findUnique({ where: { id }, select: { email: true, role: true } });
  if (!target) return { ok: false, error: "User not found" };
  if (target.role === "SUPER_ADMIN" && actor.role !== "SUPER_ADMIN") {
    return { ok: false, error: "Only the Super Admin can reset their own password" };
  }

  const tempPassword = `Temp@${Math.random().toString(36).slice(2, 8)}${Math.floor(Math.random() * 90 + 10)}`;
  await db.user.update({
    where: { id },
    data: {
      password: await bcrypt.hash(tempPassword, BCRYPT_ROUNDS),
      mustChangePassword: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });
  await logAudit({ actorId: actor.id, actorRole: actor.role, action: "user.password_reset", entity: "User", entityId: id, detail: target.email });
  revalidatePath("/admin/users");
  return { ok: true, tempPassword, info: "Password reset — share the temporary password securely" };
}

// FR-AU-05: unlock a locked account (Admin with PASSWORD_RESET, or Super Admin).
export async function unlockUser(id: string): Promise<ActionResult> {
  const actor = await requireUser();
  if (!(await hasCapability(actor, "PASSWORD_RESET"))) {
    return { ok: false, error: "403 — missing capability PASSWORD_RESET" };
  }
  await db.user.update({ where: { id }, data: { failedLoginAttempts: 0, lockedUntil: null } });
  await logAudit({ actorId: actor.id, actorRole: actor.role, action: "user.unlock", entity: "User", entityId: id });
  revalidatePath("/admin/users");
  return { ok: true, info: "Account unlocked" };
}
