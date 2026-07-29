"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/capabilities";
import { getInstituteId } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { courseSchema, updateCourseSchema } from "@/lib/validations/admin";

export type ActionResult = { ok: boolean; error?: string };

// Validates the batch + teacher exist AND belong to the caller's institute
// (multi-tenant: an admin can't attach a course to another tenant's batch/teacher).
async function validateRefs(batchId: string, teacherId: string, instituteId: string | null): Promise<string | null> {
  const [batch, teacher] = await Promise.all([
    db.batch.findFirst({ where: { id: batchId, instituteId }, select: { id: true } }),
    db.user.findFirst({ where: { id: teacherId, role: "TEACHER", instituteId }, select: { id: true } }),
  ]);
  if (!batch) return "Selected batch no longer exists";
  if (!teacher) return "Selected teacher is invalid";
  return null;
}

export async function createCourse(values: unknown): Promise<ActionResult> {
  const actor = await requireCapability("COURSE_MANAGE");

  const parsed = courseSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const data = parsed.data;

  const refError = await validateRefs(data.batchId, data.teacherId, await getInstituteId(actor.id));
  if (refError) return { ok: false, error: refError };

  const created = await db.course.create({
    data: {
      title: data.title,
      description: data.description || null,
      batchId: data.batchId,
      teacherId: data.teacherId,
    },
    select: { id: true },
  });
  // CourseBatch is the delivery source of truth (one course, many batches).
  await db.courseBatch.create({ data: { courseId: created.id, batchId: data.batchId } });

  revalidatePath("/admin/courses");
  revalidatePath("/admin");
  return { ok: true };
}

export async function updateCourse(values: unknown): Promise<ActionResult> {
  const actor = await requireCapability("COURSE_MANAGE");

  const parsed = updateCourseSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const data = parsed.data;

  const instituteId = await getInstituteId(actor.id);
  // The course being edited must belong to this institute (via its teacher).
  const owns = await db.course.findFirst({ where: { id: data.id, teacher: { instituteId } }, select: { id: true } });
  if (!owns) return { ok: false, error: "Course not found" };

  const refError = await validateRefs(data.batchId, data.teacherId, instituteId);
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
  // Keep the delivery join in sync with the primary batch (idempotent).
  await db.courseBatch.upsert({
    where: { courseId_batchId: { courseId: data.id, batchId: data.batchId } },
    update: {},
    create: { courseId: data.id, batchId: data.batchId },
  });

  revalidatePath("/admin/courses");
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteCourse(id: string): Promise<ActionResult> {
  const admin = await requireCapability("COURSE_MANAGE");
  if (!id) return { ok: false, error: "Missing course id" };

  // Multi-tenant: the course must belong to this institute (via its teacher).
  const owns = await db.course.findFirst({ where: { id, teacher: { instituteId: await getInstituteId(admin.id) } }, select: { id: true } });
  if (!owns) return { ok: false, error: "Course not found" };

  // Cascades to chapters and resources (schema onDelete).
  await db.course.delete({ where: { id } });
  await logAudit({ actorId: admin.id, actorRole: admin.role, action: "course.delete", entity: "Course", entityId: id });

  revalidatePath("/admin/courses");
  revalidatePath("/admin");
  return { ok: true };
}
