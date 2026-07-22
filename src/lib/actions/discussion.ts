"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/session";
import { getActiveBatch } from "@/lib/student";
import { notifyUser } from "@/lib/notifications/events";
import { isAdminArea } from "@/lib/roles";

export type ActionResult = { ok: boolean; error?: string; info?: string; id?: string };

// ── Q&A / Doubts ───────────────────────────────────────────────────
const askSchema = z.object({
  courseId: z.string().min(1, "Select a course"),
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(200),
  body: z.string().trim().min(3, "Add some detail").max(5000),
});

export async function askDoubt(values: unknown): Promise<ActionResult> {
  const student = await requireRole("STUDENT");
  const parsed = askSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { courseId, title, body } = parsed.data;

  const batch = await getActiveBatch(student.id);
  if (!batch) return { ok: false, error: "You are not in an active batch" };

  // Access: the course must belong to the student's active batch.
  const course = await db.course.findFirst({
    where: { id: courseId, batchId: batch.id, deletedAt: null },
    select: { id: true, title: true, teacherId: true },
  });
  if (!course) return { ok: false, error: "Course not available" };

  const doubt = await db.doubt.create({
    data: { courseId, authorId: student.id, title, body },
    select: { id: true },
  });

  // Notify the course teacher a new doubt was raised.
  await notifyUser(course.teacherId, {
    title: "New doubt raised",
    message: `${student.name} asked "${title}" in ${course.title}.`,
  });

  revalidatePath("/student/doubts");
  revalidatePath("/teacher/doubts");
  return { ok: true, id: doubt.id, info: "Doubt posted" };
}

const replySchema = z.object({
  doubtId: z.string().min(1),
  body: z.string().trim().min(1, "Write a reply").max(5000),
});

// Reply is allowed for: the course teacher, the doubt author (student), or any
// student in the same batch. Access is verified server-side before writing.
export async function replyToDoubt(values: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = replySchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { doubtId, body } = parsed.data;

  const doubt = await db.doubt.findFirst({
    where: { id: doubtId, deletedAt: null },
    select: {
      id: true, title: true, authorId: true,
      course: { select: { teacherId: true, batchId: true, title: true } },
    },
  });
  if (!doubt) return { ok: false, error: "Doubt not found" };

  const isTeacher = doubt.course.teacherId === user.id;
  let allowed = isTeacher || isAdminArea(user.role);
  if (!allowed && user.role === "STUDENT") {
    const batch = await getActiveBatch(user.id);
    allowed = !!batch && batch.id === doubt.course.batchId;
  }
  if (!allowed) return { ok: false, error: "You can't reply to this doubt" };

  await db.doubtReply.create({ data: { doubtId, authorId: user.id, body } });

  // Notify the other side (teacher → author; author/peer → teacher).
  const notifyTarget = isTeacher ? doubt.authorId : doubt.course.teacherId;
  if (notifyTarget !== user.id) {
    await notifyUser(notifyTarget, {
      title: "New reply to a doubt",
      message: `${user.name} replied on "${doubt.title}".`,
    });
  }

  revalidatePath(`/student/doubts/${doubtId}`);
  revalidatePath(`/teacher/doubts/${doubtId}`);
  return { ok: true, info: "Reply posted" };
}

export async function resolveDoubt(doubtId: string, resolved: boolean): Promise<ActionResult> {
  const user = await requireUser();
  const doubt = await db.doubt.findFirst({
    where: { id: doubtId, deletedAt: null },
    select: { id: true, authorId: true, course: { select: { teacherId: true } } },
  });
  if (!doubt) return { ok: false, error: "Doubt not found" };
  // Teacher of the course, the author, or an admin may toggle resolution.
  if (doubt.course.teacherId !== user.id && doubt.authorId !== user.id && !isAdminArea(user.role)) {
    return { ok: false, error: "Not allowed" };
  }
  await db.doubt.update({ where: { id: doubtId }, data: { isResolved: resolved } });
  revalidatePath(`/student/doubts/${doubtId}`);
  revalidatePath(`/teacher/doubts/${doubtId}`);
  return { ok: true, info: resolved ? "Marked resolved" : "Reopened" };
}

// Teacher marks a reply as the accepted answer (also resolves the doubt).
export async function acceptReply(replyId: string): Promise<ActionResult> {
  const user = await requireUser();
  const reply = await db.doubtReply.findFirst({
    where: { id: replyId, deletedAt: null },
    select: { id: true, doubtId: true, doubt: { select: { course: { select: { teacherId: true } } } } },
  });
  if (!reply) return { ok: false, error: "Reply not found" };
  if (reply.doubt.course.teacherId !== user.id && !isAdminArea(user.role)) {
    return { ok: false, error: "Only the teacher can accept an answer" };
  }
  await db.$transaction([
    db.doubtReply.updateMany({ where: { doubtId: reply.doubtId }, data: { isAccepted: false } }),
    db.doubtReply.update({ where: { id: replyId }, data: { isAccepted: true } }),
    db.doubt.update({ where: { id: reply.doubtId }, data: { isResolved: true } }),
  ]);
  revalidatePath(`/student/doubts/${reply.doubtId}`);
  revalidatePath(`/teacher/doubts/${reply.doubtId}`);
  return { ok: true, info: "Answer accepted" };
}

export async function deleteDoubt(doubtId: string): Promise<ActionResult> {
  const user = await requireUser();
  const doubt = await db.doubt.findFirst({
    where: { id: doubtId, deletedAt: null },
    select: { id: true, authorId: true, course: { select: { teacherId: true } } },
  });
  if (!doubt) return { ok: false, error: "Doubt not found" };
  if (doubt.authorId !== user.id && doubt.course.teacherId !== user.id && !isAdminArea(user.role)) {
    return { ok: false, error: "Not allowed" };
  }
  await db.doubt.update({ where: { id: doubtId }, data: { deletedAt: new Date(), deletedById: user.id } });
  revalidatePath("/student/doubts");
  revalidatePath("/teacher/doubts");
  return { ok: true, info: "Deleted" };
}

// ── Comments (on a Resource) ───────────────────────────────────────
const commentSchema = z.object({
  resourceId: z.string().min(1),
  body: z.string().trim().min(1, "Write a comment").max(3000),
});

export async function postComment(values: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = commentSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { resourceId, body } = parsed.data;

  // Access: the resource's course teacher, a batch student, or an admin.
  const resource = await db.resource.findUnique({
    where: { id: resourceId },
    select: { id: true, chapter: { select: { course: { select: { teacherId: true, batchId: true } } } } },
  });
  if (!resource) return { ok: false, error: "Resource not found" };
  const course = resource.chapter.course;

  let allowed = course.teacherId === user.id || isAdminArea(user.role);
  if (!allowed && user.role === "STUDENT") {
    const batch = await getActiveBatch(user.id);
    allowed = !!batch && batch.id === course.batchId;
  }
  if (!allowed) return { ok: false, error: "You can't comment here" };

  await db.comment.create({ data: { resourceId, authorId: user.id, body } });
  revalidatePath(`/student/resources/${resourceId}`);
  return { ok: true, info: "Comment posted" };
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  const user = await requireUser();
  const comment = await db.comment.findFirst({
    where: { id: commentId, deletedAt: null },
    select: { id: true, resourceId: true, authorId: true },
  });
  if (!comment) return { ok: false, error: "Comment not found" };
  if (comment.authorId !== user.id && !isAdminArea(user.role)) {
    return { ok: false, error: "Not allowed" };
  }
  await db.comment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
  revalidatePath(`/student/resources/${comment.resourceId}`);
  return { ok: true, info: "Deleted" };
}

// ── Feedback ───────────────────────────────────────────────────────
const feedbackSchema = z.object({
  courseId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "Pick a rating").max(5),
  comment: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function submitFeedback(values: unknown): Promise<ActionResult> {
  const student = await requireRole("STUDENT");
  const parsed = feedbackSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { courseId, rating, comment } = parsed.data;

  const batch = await getActiveBatch(student.id);
  if (!batch) return { ok: false, error: "You are not in an active batch" };

  const course = await db.course.findFirst({
    where: { id: courseId, batchId: batch.id, deletedAt: null },
    select: { id: true },
  });
  if (!course) return { ok: false, error: "Course not available" };

  await db.feedback.upsert({
    where: { courseId_studentId: { courseId, studentId: student.id } },
    update: { rating, comment: comment || null },
    create: { courseId, studentId: student.id, rating, comment: comment || null },
  });

  revalidatePath(`/student/courses/${courseId}`);
  return { ok: true, info: "Thanks for your feedback" };
}
