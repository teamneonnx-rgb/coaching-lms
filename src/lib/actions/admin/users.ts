"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { assertAdmin, assertCanDelete } from "@/lib/actions/admin/guard";
import { sendWelcomeEmail } from "@/lib/notifications/events";
import { linkParentForStudent } from "@/lib/parent";
import { logAudit } from "@/lib/audit";
import {
  adminCreateUserSchema,
  adminUpdateUserSchema,
} from "@/lib/validations/admin";

export type ActionResult = { ok: boolean; error?: string };

const BCRYPT_ROUNDS = 12; // FR-AUTH-03

export async function createUser(values: unknown): Promise<ActionResult> {
  const actor = await assertAdmin();

  const parsed = adminCreateUserSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const data = parsed.data;
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

  await sendWelcomeEmail(email, data.name); // FR-NOT welcome / credentials
  await logAudit({ actorId: actor.id, actorRole: actor.role, action: "user.create", entity: "User", entityId: created.id, detail: `${data.role} ${email}` });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateUser(values: unknown): Promise<ActionResult> {
  await assertAdmin();

  const parsed = adminUpdateUserSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const data = parsed.data;
  const email = data.email.toLowerCase();

  // Guard email uniqueness against OTHER users.
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

  // Only re-hash when a new password was supplied.
  if (data.password && data.password.length > 0) {
    updateData.password = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
  }

  await db.user.update({ where: { id: data.id }, data: updateData });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteUser(id: string): Promise<ActionResult> {
  const admin = await assertCanDelete(); // IT cannot delete (FR-ROLE-2)
  if (!id) return { ok: false, error: "Missing user id" };
  if (id === admin.id) return { ok: false, error: "You cannot delete your own account" };

  // Soft delete (FR-DATA-2) — reversible from the recycle bin.
  const target = await db.user.findUnique({ where: { id }, select: { email: true, role: true } });
  await db.user.update({
    where: { id },
    data: { deletedAt: new Date(), deletedById: admin.id },
  });

  await logAudit({ actorId: admin.id, actorRole: admin.role, action: "user.delete", entity: "User", entityId: id, detail: `${target?.role ?? ""} ${target?.email ?? ""}` });

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { ok: true };
}

export async function restoreUser(id: string): Promise<ActionResult> {
  const admin = await assertCanDelete();
  await db.user.update({ where: { id }, data: { deletedAt: null, deletedById: null } });
  await logAudit({ actorId: admin.id, actorRole: admin.role, action: "user.restore", entity: "User", entityId: id });
  revalidatePath("/admin/users");
  revalidatePath("/admin/recycle-bin");
  return { ok: true };
}
