"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { assertAdmin } from "@/lib/actions/admin/guard";
import { courseSchema, updateCourseSchema } from "@/lib/validations/admin";

export type ActionResult = { ok: boolean; error?: string };

// Validates that the referenced teacher is actually a TEACHER and the batch exists.
async function validateRefs(batchId: string, teacherId: string): Promise<string | null> {
  const [batch, teacher] = await Promise.all([
    db.batch.findUnique({ where: { id: batchId }, select: { id: true } }),
    db.user.findUnique({ where: { id: teacherId }, select: { role: true } }),
  ]);
  if (!batch) return "Selected batch no longer exists";
  if (!teacher || teacher.role !== "TEACHER") return "Selected teacher is invalid";
  return null;
}

export async function createCourse(values: unknown): Promise<ActionResult> {
  await assertAdmin();

  const parsed = courseSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const data = parsed.data;

  const refError = await validateRefs(data.batchId, data.teacherId);
  if (refError) return { ok: false, error: refError };

  await db.course.create({
    data: {
      title: data.title,
      description: data.description || null,
      batchId: data.batchId,
      teacherId: data.teacherId,
    },
  });

  revalidatePath("/admin/courses");
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateCourse(values: unknown): Promise<ActionResult> {
  await assertAdmin();

  const parsed = updateCourseSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const data = parsed.data;

  const refError = await validateRefs(data.batchId, data.teacherId);
  if (refError) return { ok: false, error: refError };

  await db.course.update({
    where: { id: data.id },
    data: {
      title: data.title,
      description: data.description || null,
      batchId: data.batchId,
      teacherId: data.teacherId,
    },
  });

  revalidatePath("/admin/courses");
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteCourse(id: string): Promise<ActionResult> {
  await assertAdmin();
  if (!id) return { ok: false, error: "Missing course id" };

  // Cascades to chapters and resources (schema onDelete).
  await db.course.delete({ where: { id } });

  revalidatePath("/admin/courses");
  revalidatePath("/admin");
  return { ok: true };
}
