"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { getSignedResourceUrl } from "@/lib/storage";
import { notifyBatchStudents, notifyUser } from "@/lib/notifications/events";

export type ActionResult = { ok: boolean; error?: string; info?: string; id?: string };

const createSchema = z.object({
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(150),
  instructions: z.string().trim().max(4000).optional().or(z.literal("")),
  courseId: z.string().min(1, "Select a course"),
  dueDate: z.string().optional().or(z.literal("")),
  totalMarks: z.coerce.number().int().min(1).max(1000),
  allowLate: z.boolean().default(true),
  submissionType: z.enum(["FILE", "TEXT", "BOTH"]),
});

const gradeSchema = z.object({
  submissionId: z.string().min(1),
  score: z.coerce.number().min(0),
  feedback: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function createAssignment(values: unknown): Promise<ActionResult> {
  const teacher = await requireRole("TEACHER");
  const parsed = createSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const owns = await db.course.findFirst({
    where: { id: data.courseId, teacherId: teacher.id, deletedAt: null },
    select: { id: true },
  });
  if (!owns) return { ok: false, error: "You don't teach that course" };

  const created = await db.assignment.create({
    data: {
      title: data.title,
      instructions: data.instructions || null,
      courseId: data.courseId,
      teacherId: teacher.id,
      dueDate: data.dueDate ? new Date(data.dueDate) : null,
      totalMarks: data.totalMarks,
      allowLate: data.allowLate,
      submissionType: data.submissionType,
    },
    select: { id: true },
  });

  // FR-NOT: notify batch students an assignment was set.
  await notifyBatchStudents(data.courseId, {
    title: "New assignment",
    message: `Assignment "${data.title}" was set${data.dueDate ? ` (due ${data.dueDate})` : ""}.`,
  });

  revalidatePath("/teacher/assignments");
  revalidatePath("/student/assignments");
  return { ok: true, id: created.id, info: "Assignment created" };
}

export async function deleteAssignment(id: string): Promise<ActionResult> {
  const teacher = await requireRole("TEACHER");
  const owned = await db.assignment.findFirst({
    where: { id, teacherId: teacher.id },
    select: { id: true },
  });
  if (!owned) return { ok: false, error: "Assignment not found" };

  await db.assignment.update({ where: { id }, data: { deletedAt: new Date(), deletedById: teacher.id } });
  revalidatePath("/teacher/assignments");
  return { ok: true };
}

export async function gradeAssignmentSubmission(values: unknown): Promise<ActionResult> {
  const teacher = await requireRole("TEACHER");
  const parsed = gradeSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { submissionId, score, feedback } = parsed.data;

  const submission = await db.assignmentSubmission.findFirst({
    where: { id: submissionId, assignment: { teacherId: teacher.id } },
    select: { id: true, studentId: true, assignment: { select: { title: true } } },
  });
  if (!submission) return { ok: false, error: "Submission not found" };

  await db.assignmentSubmission.update({
    where: { id: submissionId },
    data: { score, feedback: feedback || null, status: "GRADED", gradedById: teacher.id, gradedAt: new Date() },
  });

  await notifyUser(submission.studentId, {
    title: "Assignment graded",
    message: `Your submission for "${submission.assignment.title}" was graded (${score} marks).`,
  });

  revalidatePath("/teacher/assignments");
  revalidatePath("/student/assignments");
  return { ok: true, info: "Graded" };
}

// Signed URL for a teacher to view a student's uploaded file.
export async function getAssignmentFileUrl(submissionId: string): Promise<{ ok: boolean; url?: string; error?: string }> {
  const teacher = await requireRole("TEACHER");
  const s = await db.assignmentSubmission.findFirst({
    where: { id: submissionId, assignment: { teacherId: teacher.id } },
    select: { fileKey: true },
  });
  if (!s?.fileKey) return { ok: false, error: "No file on this submission" };
  if (/^https?:\/\//i.test(s.fileKey)) return { ok: true, url: s.fileKey };
  const url = await getSignedResourceUrl(s.fileKey);
  if (!url) return { ok: false, error: "File storage not configured" };
  return { ok: true, url };
}
