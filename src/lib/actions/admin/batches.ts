"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/actions/admin/guard";
import { requireUser } from "@/lib/session";
import { batchSchema, updateBatchSchema } from "@/lib/validations/admin";

export type ActionResult = { ok: boolean; error?: string };

// FR-BAT-1 / FR-ROLE-3: both ADMIN and TEACHER can create batches.
export async function createBatch(values: unknown): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "ADMIN" && user.role !== "TEACHER") {
    return { ok: false, error: "Not authorized" };
  }

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
  revalidatePath("/teacher/batches");
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
