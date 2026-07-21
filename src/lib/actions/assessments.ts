"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { getSignedResourceUrl } from "@/lib/storage";
import {
  assessmentSchema,
  gradeSubmissionSchema,
} from "@/lib/validations/assessment";

export type ActionResult = { ok: boolean; error?: string; info?: string; id?: string };

async function teacherOwnsCourse(teacherId: string, courseId: string) {
  const course = await db.course.findFirst({
    where: { id: courseId, teacherId },
    select: { id: true },
  });
  return Boolean(course);
}

function buildQuestionCreate(
  questions: {
    text: string;
    points: number;
    options: { text: string; isCorrect: boolean }[];
  }[]
) {
  return questions.map((q, qi) => ({
    text: q.text,
    points: q.points,
    order: qi,
    options: {
      create: q.options.map((o, oi) => ({
        text: o.text,
        isCorrect: o.isCorrect,
        order: oi,
      })),
    },
  }));
}

// Create or update an assessment (full builder save).
export async function saveAssessment(values: unknown): Promise<ActionResult> {
  const teacher = await requireRole("TEACHER");
  const parsed = assessmentSchema.safeParse(values);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;

  if (!(await teacherOwnsCourse(teacher.id, data.courseId))) {
    return { ok: false, error: "You don't teach that course" };
  }

  const meta = {
    title: data.title,
    description: data.description || null,
    type: data.type,
    courseId: data.courseId,
    negativeMarking: data.type === "OBJECTIVE" ? data.negativeMarking : 0,
    timeLimit: data.timeLimit && data.timeLimit > 0 ? data.timeLimit : null,
  };

  const questionCreate = data.type === "OBJECTIVE" ? buildQuestionCreate(data.questions) : [];

  // ── Update ──
  if (data.id) {
    const existing = await db.assessment.findFirst({
      where: { id: data.id, teacherId: teacher.id },
      select: { id: true, _count: { select: { submissions: true } } },
    });
    if (!existing) return { ok: false, error: "Assessment not found" };

    // Structural (question) edits are locked once students have submitted.
    if (existing._count.submissions > 0) {
      await db.assessment.update({ where: { id: data.id }, data: meta });
      revalidatePath("/teacher/assessments");
      return {
        ok: true,
        id: data.id,
        info: "Saved. Questions are locked because submissions exist.",
      };
    }

    await db.assessment.update({
      where: { id: data.id },
      data: {
        ...meta,
        questions: { deleteMany: {}, create: questionCreate },
      },
    });
    revalidatePath("/teacher/assessments");
    return { ok: true, id: data.id, info: "Assessment saved" };
  }

  // ── Create ──
  const created = await db.assessment.create({
    data: { ...meta, teacherId: teacher.id, questions: { create: questionCreate } },
    select: { id: true },
  });
  revalidatePath("/teacher/assessments");
  return { ok: true, id: created.id, info: "Assessment created" };
}

export async function publishAssessment(
  id: string,
  publish: boolean
): Promise<ActionResult> {
  const teacher = await requireRole("TEACHER");

  const assessment = await db.assessment.findFirst({
    where: { id, teacherId: teacher.id },
    select: { type: true, _count: { select: { questions: true } } },
  });
  if (!assessment) return { ok: false, error: "Assessment not found" };

  if (publish && assessment.type === "OBJECTIVE" && assessment._count.questions === 0) {
    return { ok: false, error: "Add at least one question before publishing" };
  }

  await db.assessment.update({ where: { id }, data: { isPublished: publish } });
  revalidatePath("/teacher/assessments");
  return { ok: true, info: publish ? "Published" : "Unpublished" };
}

export async function deleteAssessment(id: string): Promise<ActionResult> {
  const teacher = await requireRole("TEACHER");
  const owned = await db.assessment.findFirst({
    where: { id, teacherId: teacher.id },
    select: { id: true },
  });
  if (!owned) return { ok: false, error: "Assessment not found" };

  await db.assessment.delete({ where: { id } }); // cascades questions/options/submissions
  revalidatePath("/teacher/assessments");
  return { ok: true };
}

// Manually grade a subjective submission.
export async function gradeSubmission(values: unknown): Promise<ActionResult> {
  const teacher = await requireRole("TEACHER");
  const parsed = gradeSubmissionSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { submissionId, score, feedback } = parsed.data;

  // Verify the submission belongs to one of the teacher's assessments.
  const submission = await db.submission.findFirst({
    where: { id: submissionId, assessment: { teacherId: teacher.id } },
    select: { id: true, assessmentId: true },
  });
  if (!submission) return { ok: false, error: "Submission not found" };

  await db.submission.update({
    where: { id: submissionId },
    data: {
      score,
      status: "GRADED",
      feedback: feedback || null,
      gradedById: teacher.id,
      gradedAt: new Date(),
    },
  });

  revalidatePath("/teacher/assessments");
  revalidatePath("/student/assessments");
  return { ok: true, info: "Graded" };
}

// Signed URL for a subjective submission's uploaded scan (teacher-only).
export async function getSubmissionFileUrl(
  submissionId: string
): Promise<{ ok: boolean; url?: string; error?: string }> {
  const teacher = await requireRole("TEACHER");
  const submission = await db.submission.findFirst({
    where: { id: submissionId, assessment: { teacherId: teacher.id } },
    select: { fileKey: true },
  });
  if (!submission?.fileKey) return { ok: false, error: "No file on this submission" };

  const url = await getSignedResourceUrl(submission.fileKey);
  if (!url) return { ok: false, error: "File storage is not configured" };
  return { ok: true, url };
}
