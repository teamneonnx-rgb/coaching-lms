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

// FR-AD-10/11: assign / reassign the batch's owning teacher (and optional
// schedule + capacity). Historical attendance keeps markedById and content
// keeps its authoring teacher — reassignment never rewrites history.
export async function assignBatchTeacher(values: {
  batchId: string;
  teacherId: string;
  scheduleDays?: string;
  scheduleTime?: string;
  capacity?: number;
}): Promise<ActionResult> {
  const admin = await requireCapability("BATCH_MANAGE");
  const { batchId, teacherId } = values;
  if (!batchId || !teacherId) return { ok: false, error: "Missing batch or teacher" };

  const teacher = await db.user.findFirst({
    where: { id: teacherId, role: "TEACHER", deletedAt: null },
    select: { id: true, name: true },
  });
  if (!teacher) return { ok: false, error: "Selected teacher is invalid" };

  const before = await db.batch.findUnique({ where: { id: batchId }, select: { teacherId: true } });
  await db.batch.update({
    where: { id: batchId },
    data: {
      teacherId,
      scheduleDays: values.scheduleDays?.trim() || undefined,
      scheduleTime: values.scheduleTime?.trim() || undefined,
      capacity: values.capacity && values.capacity > 0 ? values.capacity : undefined,
    },
  });
  await logAudit({
    actorId: admin.id, actorRole: admin.role, action: "batch.assign_teacher",
    entity: "Batch", entityId: batchId, detail: teacher.name,
    beforeValue: JSON.stringify({ teacherId: before?.teacherId ?? null }),
    afterValue: JSON.stringify({ teacherId }),
  });

  revalidatePath(`/admin/batches/${batchId}`);
  revalidatePath("/admin/teachers");
  return { ok: true, info: `Assigned to ${teacher.name}` };
}

export async function deleteBatch(id: string): Promise<ActionResult> {
  const admin = await requireCapability("BATCH_MANAGE");
  if (!id) return { ok: false, error: "Missing batch id" };

  // FR-AD-13: a batch with attendance or result records cannot be deleted —
  // only archived. Enforced server-side.
  const [attendanceCount, submissionCount] = await Promise.all([
    db.attendance.count({ where: { batchId: id } }),
    db.submission.count({ where: { assessment: { course: { batches: { some: { batchId: id } } } } } }),
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
