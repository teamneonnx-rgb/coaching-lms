"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/actions/admin/guard";
import { sendWelcomeEmail } from "@/lib/notifications/events";
import {
  adminCreateUserSchema,
  adminUpdateUserSchema,
} from "@/lib/validations/admin";

export type ActionResult = { ok: boolean; error?: string };

const BCRYPT_ROUNDS = 12; // FR-AUTH-03

export async function createUser(values: unknown): Promise<ActionResult> {
  await assertAdmin();

  const parsed = adminCreateUserSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const data = parsed.data;
  const email = data.email.toLowerCase();

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) return { ok: false, error: "Email already in use" };

  const password = await bcrypt.hash(data.password, BCRYPT_ROUNDS);

  await db.user.create({
    data: {
      name: data.name,
      email,
      password,
      role: data.role,
      parentName: data.parentName || null,
      parentPhone: data.parentPhone || null,
      parentEmail: data.parentEmail || null,
    },
  });

  await sendWelcomeEmail(email, data.name); // FR-NOT welcome / credentials

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
  const admin = await assertAdmin();
  if (!id) return { ok: false, error: "Missing user id" };
  if (id === admin.id) return { ok: false, error: "You cannot delete your own account" };

  try {
    await db.user.delete({ where: { id } });
  } catch (error) {
    // Teachers with courses / users with attendance are restricted by FKs.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return {
        ok: false,
        error: "Cannot delete: user still owns courses or attendance records",
      };
    }
    throw error;
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin");
  return { ok: true };
}
