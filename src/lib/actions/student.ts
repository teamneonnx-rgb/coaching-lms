"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { getActiveBatch, getResourceForStudent } from "@/lib/student";

export type ActionResult = { ok: boolean; error?: string };

const idSchema = z.object({ resourceId: z.string().min(1) });

// Marks a resource complete for the current student. Verifies the resource is
// in the student's active batch first (FR-COURSE-02).
export async function markResourceComplete(values: unknown): Promise<ActionResult> {
  const user = await requireRole("STUDENT");
  const parsed = idSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const batch = await getActiveBatch(user.id);
  if (!batch) return { ok: false, error: "You are not enrolled in an active batch" };

  const resource = await getResourceForStudent(parsed.data.resourceId, batch.id);
  if (!resource) return { ok: false, error: "Resource not found in your batch" };

  await db.resourceProgress.upsert({
    where: {
      studentId_resourceId: { studentId: user.id, resourceId: resource.id },
    },
    update: { completedAt: new Date() },
    create: { studentId: user.id, resourceId: resource.id },
  });

  revalidatePath("/student");
  revalidatePath(`/student/resources/${resource.id}`);
  return { ok: true };
}

export async function markResourceIncomplete(values: unknown): Promise<ActionResult> {
  const user = await requireRole("STUDENT");
  const parsed = idSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  await db.resourceProgress.deleteMany({
    where: { studentId: user.id, resourceId: parsed.data.resourceId },
  });

  revalidatePath("/student");
  revalidatePath(`/student/resources/${parsed.data.resourceId}`);
  return { ok: true };
}
