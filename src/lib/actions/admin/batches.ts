"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/capabilities";
import { logAudit } from "@/lib/audit";
import { batchSchema, updateBatchSchema } from "@/lib/validations/admin";

export type ActionResult = { ok: boolean; error?: string; info?: string };

// FR-AD-10 / PRD §4.2: batches are created by Admin only (BATCH_MANAGE
// capability; Super Admin always). The former teacher create-path is removed.
export async function createBatch(values: unknown): Promise<ActionResult> {
  await requireCapability("BATCH_MANAGE");

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
  await requireCapability("BATCH_MANAGE");

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
  const admin = await requireCapability("BATCH_MANAGE");
  if (!id) return { ok: false, error: "Missing batch id" };

  // FR-AD-13: a batch with attendance or result records cannot be deleted —
  // only archived. Enforced server-side.
  const [attendanceCount, submissionCount] = await Promise.all([
    db.attendance.count({ where: { batchId: id } }),
    db.submission.count({ where: { assessment: { course: { batchId: id } } } }),
  ]);
  if (attendanceCount > 0 || submissionCount > 0) {
    await db.batch.update({ where: { id }, data: { isActive: false } });
    await logAudit({ actorId: admin.id, actorRole: admin.role, action: "batch.archive", entity: "Batch", entityId: id, detail: "delete blocked — has attendance/result records" });
    revalidatePath("/admin/batches");
    return { ok: true, info: "Batch has attendance/result records — archived instead of deleted" };
  }

  // Cascades to enrollments, courses, chapters, resources (schema onDelete).
  await db.batch.delete({ where: { id } });
  await logAudit({ actorId: admin.id, actorRole: admin.role, action: "batch.delete", entity: "Batch", entityId: id });

  revalidatePath("/admin/batches");
  revalidatePath("/admin");
  return { ok: true };
}
