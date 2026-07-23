"use server";

import { revalidatePath } from "next/cache";
import { assertNotImpersonating } from "@/lib/impersonation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { getActiveBatch } from "@/lib/student";
import { getSignedUploadUrl } from "@/lib/storage";

export type ActionResult = { ok: boolean; error?: string; info?: string };

const submitSchema = z.object({
  assignmentId: z.string().min(1),
  text: z.string().trim().max(10000).optional().or(z.literal("")),
  fileKey: z.string().trim().max(1000).optional().or(z.literal("")),
});

export async function submitAssignment(values: unknown): Promise<ActionResult> {
  const student = await requireRole("STUDENT");
  await assertNotImpersonating();
  const parsed = submitSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { assignmentId, text, fileKey } = parsed.data;

  if (!text && !fileKey) return { ok: false, error: "Add text or a file to submit" };

  const batch = await getActiveBatch(student.id);
  if (!batch) return { ok: false, error: "You are not in an active batch" };

  const assignment = await db.assignment.findFirst({
    where: { id: assignmentId, course: { batches: { some: { batchId: batch.id } } }, deletedAt: null },
    select: { id: true, dueDate: true, allowLate: true },
  });
  if (!assignment) return { ok: false, error: "Assignment not available" };

  const now = new Date();
  const isLate = assignment.dueDate ? now > assignment.dueDate : false;
  if (isLate && !assignment.allowLate) {
    return { ok: false, error: "The deadline has passed and late submissions are not allowed" };
  }

  // Resubmission allowed — upsert. Grading resets to SUBMITTED on resubmit.
  await db.assignmentSubmission.upsert({
    where: { assignmentId_studentId: { assignmentId, studentId: student.id } },
    update: { text: text || null, fileKey: fileKey || null, isLate, status: "SUBMITTED", score: null, feedback: null, gradedById: null, gradedAt: null, submittedAt: now },
    create: { assignmentId, studentId: student.id, text: text || null, fileKey: fileKey || null, isLate },
  });

  revalidatePath("/student/assignments");
  return { ok: true, info: isLate ? "Submitted (late)" : "Submitted" };
}

export async function getAssignmentUploadUrl(input: {
  assignmentId: string;
  fileName: string;
  contentType: string;
}): Promise<{ ok: boolean; url?: string; fileKey?: string; error?: string }> {
  const student = await requireRole("STUDENT");
  await assertNotImpersonating();
  const batch = await getActiveBatch(student.id);
  if (!batch) return { ok: false, error: "You are not in an active batch" };

  const assignment = await db.assignment.findFirst({
    where: { id: input.assignmentId, course: { batches: { some: { batchId: batch.id } } }, deletedAt: null },
    select: { id: true },
  });
  if (!assignment) return { ok: false, error: "Assignment not available" };

  const safe = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  const fileKey = `assignments/${input.assignmentId}/${student.id}/${Date.now()}-${safe}`;
  const url = await getSignedUploadUrl(fileKey, input.contentType);
  if (!url) return { ok: false, error: "File uploads aren't configured yet" };
  return { ok: true, url, fileKey };
}
