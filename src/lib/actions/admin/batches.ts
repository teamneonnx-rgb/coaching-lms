"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/actions/admin/guard";
import { batchSchema, updateBatchSchema } from "@/lib/validations/admin";

export type ActionResult = { ok: boolean; error?: string };

export async function createBatch(values: unknown): Promise<ActionResult> {
  await assertAdmin();

  const parsed = batchSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const data = parsed.data;

  try {
    await db.batch.create({
      data: {
        name: data.name,
        description: data.description || null,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        isActive: data.isActive,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "A batch with this name already exists" };
    }
    throw error;
  }

  revalidatePath("/admin/batches");
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateBatch(values: unknown): Promise<ActionResult> {
  await assertAdmin();

  const parsed = updateBatchSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const data = parsed.data;

  try {
    await db.batch.update({
      where: { id: data.id },
      data: {
        name: data.name,
        description: data.description || null,
        startDate: data.startDate,
        endDate: data.endDate ?? null,
        isActive: data.isActive,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "A batch with this name already exists" };
    }
    throw error;
  }

  revalidatePath("/admin/batches");
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteBatch(id: string): Promise<ActionResult> {
  await assertAdmin();
  if (!id) return { ok: false, error: "Missing batch id" };

  // Cascades to enrollments, courses, chapters, resources (schema onDelete).
  await db.batch.delete({ where: { id } });

  revalidatePath("/admin/batches");
  revalidatePath("/admin");
  return { ok: true };
}
