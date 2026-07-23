"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { getActiveBatch } from "@/lib/student";
import { getSignedUploadUrl } from "@/lib/storage";
import { gradeAttempt, type QuestionType } from "@/lib/grading";
import { notifyUser } from "@/lib/notifications/events";
import {
  objectiveSubmissionSchema,
  subjectiveSubmissionSchema,
} from "@/lib/validations/assessment";

export type ActionResult = { ok: boolean; error?: string; info?: string };

// Test submission (FR-AD-56..58). Objective questions auto-score instantly.
// If the test has long-answer questions the attempt is split: the objective
// score shows now, and the attempt stays "partial — awaiting evaluation" until
// the batch teacher marks the long answers.
export async function submitObjective(values: unknown): Promise<ActionResult> {
  const student = await requireRole("STUDENT");
  const parsed = objectiveSubmissionSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { assessmentId, answers } = parsed.data;

  const batch = await getActiveBatch(student.id);
  if (!batch) return { ok: false, error: "You are not in an active batch" };

  // Published + objective + in the student's batch (isolation).
  const assessment = await db.assessment.findFirst({
    where: { id: assessmentId, isPublished: true, type: "OBJECTIVE", course: { batches: { some: { batchId: batch.id } } } },
    select: {
      negativeMarking: true,
      teacherId: true,
      title: true,
      questions: {
        select: {
          id: true,
          type: true,
          points: true,
          correctAnswer: true,
          options: { select: { id: true, isCorrect: true } },
        },
      },
    },
  });
  if (!assessment) return { ok: false, error: "Assessment not available" };

  const gradable = assessment.questions.map((q) => ({
    id: q.id,
    type: q.type as QuestionType,
    points: q.points,
    correctOptionId: q.options.find((o) => o.isCorrect)?.id ?? null,
    correctAnswer: q.correctAnswer,
  }));

  const validQuestionIds = new Set(gradable.map((q) => q.id));
  const cleanAnswers = answers.filter((a) => validQuestionIds.has(a.questionId));

  const result = gradeAttempt(gradable, cleanAnswers, assessment.negativeMarking);
  const totalMax = result.objectiveMax + result.subjectiveMax;

  try {
    await db.submission.create({
      data: {
        assessmentId,
        studentId: student.id,
        // Long answers pending → SUBMITTED + PARTIAL; else GRADED + EVALUATED.
        status: result.hasLongAnswers ? "SUBMITTED" : "GRADED",
        evaluationStatus: result.hasLongAnswers ? "PARTIAL_AWAITING_EVALUATION" : "EVALUATED",
        objectiveScore: result.objectiveScore,
        subjectiveScore: result.hasLongAnswers ? null : 0,
        score: result.hasLongAnswers ? result.objectiveScore : result.objectiveScore,
        maxScore: totalMax,
        gradedAt: result.hasLongAnswers ? null : new Date(),
        answers: {
          create: result.graded.map((g) => ({
            questionId: g.questionId,
            selectedOptionId: g.selectedOptionId,
            studentAnswer: g.studentAnswer,
            isCorrect: g.isCorrect,
            marksAwarded: g.marksAwarded,
            autoScored: g.autoScored,
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

  // FR-TE-14: put the attempt in the teacher's evaluation queue.
  if (result.hasLongAnswers) {
    await notifyUser(assessment.teacherId, {
      title: "Long answers to evaluate",
      message: `${student.name} submitted "${assessment.title}" — long answers await your marking.`,
    });
    revalidatePath("/teacher/evaluations");
  }

  revalidatePath("/student/assessments");
  return {
    ok: true,
    info: result.hasLongAnswers
      ? `Submitted — objective score ${result.objectiveScore}/${result.objectiveMax}. Long answers awaiting evaluation.`
      : `Submitted — you scored ${result.objectiveScore}/${totalMax}`,
  };
}

// FR-TE-13: teacher marks the long answers of a partial attempt. Awards marks
// + optional remark per long-answer, sums with the objective score, publishes
// the final total and notifies the student.
export async function evaluateLongAnswers(values: unknown): Promise<ActionResult> {
  const teacher = await requireRole("TEACHER");
  const { evaluateLongAnswersSchema } = await import("@/lib/validations/assessment");
  const parsed = evaluateLongAnswersSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { submissionId, marks } = parsed.data;

  const submission = await db.submission.findFirst({
    where: { id: submissionId, assessment: { teacherId: teacher.id } },
    select: {
      id: true, studentId: true, objectiveScore: true, maxScore: true,
      assessment: { select: { title: true } },
      answers: { where: { autoScored: false }, select: { id: true, questionId: true, question: { select: { points: true } } } },
    },
  });
  if (!submission) return { ok: false, error: "Submission not found" };

  const markById = new Map(marks.map((m) => [m.answerId, m]));
  let subjectiveScore = 0;
  for (const ans of submission.answers) {
    const m = markById.get(ans.id);
    if (!m) return { ok: false, error: "Mark every long answer before submitting" };
    if (m.marksAwarded > ans.question.points) {
      return { ok: false, error: `A long answer's marks exceed its ${ans.question.points} points` };
    }
    subjectiveScore += m.marksAwarded;
    await db.answer.update({
      where: { id: ans.id },
      data: { marksAwarded: m.marksAwarded, evaluatorRemark: m.remark || null },
    });
  }

  const total = Math.round(((submission.objectiveScore ?? 0) + subjectiveScore) * 100) / 100;
  await db.submission.update({
    where: { id: submissionId },
    data: {
      subjectiveScore,
      score: total,
      status: "GRADED",
      evaluationStatus: "EVALUATED",
      gradedById: teacher.id,
      gradedAt: new Date(),
    },
  });

  await notifyUser(submission.studentId, {
    title: "Test evaluated",
    message: `Your long answers for "${submission.assessment.title}" were marked. Final: ${total}/${submission.maxScore ?? "?"}.`,
  });

  revalidatePath("/teacher/evaluations");
  revalidatePath("/student/assessments");
  return { ok: true, info: `Evaluated — final ${total}/${submission.maxScore ?? "?"}` };
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
    where: { id: input.assessmentId, isPublished: true, type: "SUBJECTIVE", course: { batches: { some: { batchId: batch.id } } } },
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
    where: { id: assessmentId, isPublished: true, type: "SUBJECTIVE", course: { batches: { some: { batchId: batch.id } } } },
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
