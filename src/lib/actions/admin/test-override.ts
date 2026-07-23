"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/capabilities";
import { notifyUser } from "@/lib/notifications/events";
import { logAudit } from "@/lib/audit";
import { overrideScoreSchema } from "@/lib/validations/assessment";

export type ActionResult = { ok: boolean; error?: string; info?: string };

// FR-AD-59: Admin override authority on any test mark, auto-scored or
// teacher-marked. Records overriddenById and audits before/after.
export async function overrideTestScore(values: unknown): Promise<ActionResult> {
  const admin = await requireCapability("RESULT_MANAGE");
  const parsed = overrideScoreSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { submissionId, score, feedback } = parsed.data;

  const submission = await db.submission.findUnique({
    where: { id: submissionId },
    select: {
      id: true, studentId: true, score: true, maxScore: true,
      assessment: { select: { title: true } },
      student: { select: { name: true } },
    },
  });
  if (!submission) return { ok: false, error: "Submission not found" };
  if (submission.maxScore != null && score > submission.maxScore) {
    return { ok: false, error: `Score can't exceed ${submission.maxScore}` };
  }

  await db.submission.update({
    where: { id: submissionId },
    data: {
      score,
      feedback: feedback || undefined,
      status: "GRADED",
      evaluationStatus: "EVALUATED",
      overriddenById: admin.id,
      gradedAt: new Date(),
    },
  });

  await logAudit({
    actorId: admin.id, actorRole: admin.role, action: "test.override",
    entity: "Submission", entityId: submissionId,
    detail: `${submission.assessment.title} · ${submission.student.name}`,
    beforeValue: JSON.stringify({ score: submission.score }),
    afterValue: JSON.stringify({ score }),
  });

  await notifyUser(submission.studentId, {
    title: "Test mark updated",
    message: `Your mark for "${submission.assessment.title}" was updated to ${score}/${submission.maxScore ?? "?"} by the admin.`,
  });

  revalidatePath("/admin/results");
  revalidatePath("/student/assessments");
  return { ok: true, info: "Mark overridden" };
}
