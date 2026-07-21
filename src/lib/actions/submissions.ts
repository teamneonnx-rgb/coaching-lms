"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { getActiveBatch } from "@/lib/student";
import { getSignedUploadUrl } from "@/lib/storage";
import { gradeObjective } from "@/lib/grading";
import {
  objectiveSubmissionSchema,
  subjectiveSubmissionSchema,
} from "@/lib/validations/assessment";

export type ActionResult = { ok: boolean; error?: string; info?: string };

// Auto-graded objective submission (Module C — grading + negative marking).
export async function submitObjective(values: unknown): Promise<ActionResult> {
  const student = await requireRole("STUDENT");
  const parsed = objectiveSubmissionSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { assessmentId, answers } = parsed.data;

  const batch = await getActiveBatch(student.id);
  if (!batch) return { ok: false, error: "You are not in an active batch" };

  // Published + objective + in the student's batch (isolation).
  const assessment = await db.assessment.findFirst({
    where: { id: assessmentId, isPublished: true, type: "OBJECTIVE", course: { batchId: batch.id } },
    select: {
      negativeMarking: true,
      questions: {
        select: {
          id: true,
          points: true,
          options: { select: { id: true, isCorrect: true } },
        },
      },
    },
  });
  if (!assessment) return { ok: false, error: "Assessment not available" };

  const gradable = assessment.questions.map((q) => ({
    id: q.id,
    points: q.points,
    correctOptionId: q.options.find((o) => o.isCorrect)?.id ?? null,
  }));

  const validQuestionIds = new Set(gradable.map((q) => q.id));
  const cleanAnswers = answers.filter((a) => validQuestionIds.has(a.questionId));

  const result = gradeObjective(gradable, cleanAnswers, assessment.negativeMarking);

  try {
    await db.submission.create({
      data: {
        assessmentId,
        studentId: student.id,
        status: "GRADED", // objective grades instantly
        score: result.score,
        maxScore: result.maxScore,
        gradedAt: new Date(),
        answers: {
          create: result.graded.map((g) => ({
            questionId: g.questionId,
            selectedOptionId: g.selectedOptionId,
            isCorrect: g.isCorrect,
          })),
        },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "You have already submitted this test" };
    }
    throw error;
  }

  revalidatePath("/student/assessments");
  return { ok: true, info: `Submitted — you scored ${result.score}/${result.maxScore}` };
}

// Presigned upload URL for a subjective answer scan (PDF/image).
export async function getSubjectiveUploadUrl(input: {
  assessmentId: string;
  fileName: string;
  contentType: string;
}): Promise<{ ok: boolean; url?: string; fileKey?: string; error?: string }> {
  const student = await requireRole("STUDENT");
  const batch = await getActiveBatch(student.id);
  if (!batch) return { ok: false, error: "You are not in an active batch" };

  const allowed = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
  if (!allowed.includes(input.contentType)) {
    return { ok: false, error: "Upload a PDF or image (PNG/JPG)" };
  }

  const assessment = await db.assessment.findFirst({
    where: { id: input.assessmentId, isPublished: true, type: "SUBJECTIVE", course: { batchId: batch.id } },
    select: { id: true },
  });
  if (!assessment) return { ok: false, error: "Assessment not available" };

  const safeName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  const fileKey = `submissions/${input.assessmentId}/${student.id}/${Date.now()}-${safeName}`;

  const url = await getSignedUploadUrl(fileKey, input.contentType);
  if (!url) return { ok: false, error: "File uploads are not configured yet" };

  return { ok: true, url, fileKey };
}

// Subjective submission — records the uploaded scan for manual grading.
export async function submitSubjective(values: unknown): Promise<ActionResult> {
  const student = await requireRole("STUDENT");
  const parsed = subjectiveSubmissionSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { assessmentId, fileKey } = parsed.data;

  const batch = await getActiveBatch(student.id);
  if (!batch) return { ok: false, error: "You are not in an active batch" };

  const assessment = await db.assessment.findFirst({
    where: { id: assessmentId, isPublished: true, type: "SUBJECTIVE", course: { batchId: batch.id } },
    select: { id: true },
  });
  if (!assessment) return { ok: false, error: "Assessment not available" };

  try {
    await db.submission.create({
      data: { assessmentId, studentId: student.id, status: "SUBMITTED", fileKey },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false, error: "You have already submitted this test" };
    }
    throw error;
  }

  revalidatePath("/student/assessments");
  return { ok: true, info: "Submitted for grading" };
}
