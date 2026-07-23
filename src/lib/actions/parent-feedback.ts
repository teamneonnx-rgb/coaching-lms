"use server";

import { revalidatePath } from "next/cache";
import { assertNotImpersonating } from "@/lib/impersonation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";

export type ActionResult = { ok: boolean; error?: string; info?: string };

const schema = z.object({
  wardId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Pick a rating").max(5),
  comments: z.string().trim().max(2000).optional().or(z.literal("")),
});

// FR-PA-01: parent monthly feedback about the teacher and course — ONCE per
// calendar month per ward, enforced server-side.
export async function submitMonthlyFeedback(values: unknown): Promise<ActionResult> {
  const parent = await requireRole("PARENT");
  await assertNotImpersonating();
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { wardId, rating, comments } = parsed.data;

  // The ward must actually be linked to this parent.
  const link = await db.parentLink.findFirst({
    where: { parentId: parent.id, studentId: wardId },
    select: { id: true },
  });
  if (!link) return { ok: false, error: "That student isn't linked to your account" };

  const period = new Date().toISOString().slice(0, 7); // "yyyy-MM"
  const existing = await db.feedback.findFirst({
    where: { studentId: parent.id, givenByRole: "PARENT", wardId, period },
    select: { id: true },
  });
  if (existing) return { ok: false, error: "You've already submitted feedback for this ward this month" };

  // Target the ward's batch teacher (the course/teacher pair the PRD describes).
  const enrollment = await db.enrollment.findFirst({
    where: { studentId: wardId, isActive: true },
    select: { batch: { select: { teacherId: true } } },
  });

  await db.feedback.create({
    data: {
      studentId: parent.id, // FeedbackAuthor relation = the submitting user
      givenByRole: "PARENT",
      wardId,
      period,
      rating,
      comment: comments || null,
      targetTeacherId: enrollment?.batch.teacherId ?? null,
    },
  });

  revalidatePath("/parent");
  return { ok: true, info: "Thanks — feedback recorded for this month" };
}
