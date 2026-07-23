"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { isAdminArea } from "@/lib/roles";
import { hasCapability } from "@/lib/capabilities";
import { getSignedUploadUrl } from "@/lib/storage";
import { notifyBatchStudents, notifyAdmins } from "@/lib/notifications/events";
import { getAccessPolicy } from "@/lib/access-policy";

// Content authoring (FR-CRS / FR-RES / FR-CNT). Both ADMIN (any course) and
// TEACHER (own courses) can post content — server-side authorization (FR-RBAC-1).

export type ActionResult = { ok: boolean; error?: string; id?: string };

// Authorization: Super Admin / Admin with COURSE_MANAGE manage any course;
// teacher only their own. IT has no business-write path (FR-IT-06).
async function assertCanManageCourse(courseId: string) {
  const { assertNotImpersonating } = await import("@/lib/impersonation");
  await assertNotImpersonating();
  const user = await requireUser();
  if (isAdminArea(user.role)) {
    if (await hasCapability(user, "COURSE_MANAGE")) return user;
    throw new Error("403 — missing capability COURSE_MANAGE");
  }
  if (user.role === "TEACHER") {
    const course = await db.course.findFirst({
      where: { id: courseId, teacherId: user.id },
      select: { id: true },
    });
    if (course) return user;
  }
  throw new Error("Not authorized to manage this course");
}

async function courseIdForChapter(chapterId: string) {
  const chapter = await db.chapter.findUnique({
    where: { id: chapterId },
    select: { courseId: true },
  });
  return chapter?.courseId ?? null;
}

const chapterCreateSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(150),
});
const chapterUpdateSchema = z.object({
  id: z.string().min(1),
  title: z.string().trim().min(2).max(150),
});
const resourceCreateSchema = z.object({
  chapterId: z.string().min(1),
  title: z.string().trim().min(2, "Title must be at least 2 characters").max(200),
  type: z.enum(["VIDEO", "PDF"]),
  // A full URL (YouTube/CDN/PDF link) or an S3/R2 object key.
  fileKey: z.string().trim().min(1, "Provide a file URL or upload a file").max(1000),
  duration: z.coerce.number().int().min(0).optional(),
});

function contentPaths(courseId: string) {
  revalidatePath(`/admin/courses/${courseId}`);
  revalidatePath(`/teacher/content/${courseId}`);
  revalidatePath("/student/courses");
}

export async function createChapter(values: unknown): Promise<ActionResult> {
  const parsed = chapterCreateSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  await assertCanManageCourse(parsed.data.courseId);

  const count = await db.chapter.count({ where: { courseId: parsed.data.courseId } });
  const chapter = await db.chapter.create({
    data: { courseId: parsed.data.courseId, title: parsed.data.title, order: count },
    select: { id: true },
  });
  contentPaths(parsed.data.courseId);
  return { ok: true, id: chapter.id };
}

export async function updateChapter(values: unknown): Promise<ActionResult> {
  const parsed = chapterUpdateSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const courseId = await courseIdForChapter(parsed.data.id);
  if (!courseId) return { ok: false, error: "Chapter not found" };
  await assertCanManageCourse(courseId);

  await db.chapter.update({ where: { id: parsed.data.id }, data: { title: parsed.data.title } });
  contentPaths(courseId);
  return { ok: true };
}

export async function deleteChapter(id: string): Promise<ActionResult> {
  const courseId = await courseIdForChapter(id);
  if (!courseId) return { ok: false, error: "Chapter not found" };
  await assertCanManageCourse(courseId);
  await db.chapter.delete({ where: { id } }); // cascades resources
  contentPaths(courseId);
  return { ok: true };
}

export async function createResource(values: unknown): Promise<ActionResult> {
  const parsed = resourceCreateSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const courseId = await courseIdForChapter(parsed.data.chapterId);
  if (!courseId) return { ok: false, error: "Chapter not found" };
  const user = await assertCanManageCourse(courseId);

  // FR-APR / FR-ACL: admin content is always auto-approved; teacher content is
  // auto-approved only when the institute's approval policy is switched off.
  const policy = await getAccessPolicy();
  const autoApprove = isAdminArea(user.role) || !policy.contentApproval;

  const count = await db.resource.count({ where: { chapterId: parsed.data.chapterId } });
  const resource = await db.resource.create({
    data: {
      chapterId: parsed.data.chapterId,
      title: parsed.data.title,
      type: parsed.data.type,
      fileKey: parsed.data.fileKey,
      duration: parsed.data.type === "VIDEO" ? parsed.data.duration ?? null : null,
      order: count,
      approvalStatus: autoApprove ? "APPROVED" : "PENDING",
      reviewedById: autoApprove ? user.id : null,
      reviewedAt: autoApprove ? new Date() : null,
    },
    select: { id: true },
  });

  if (autoApprove) {
    // FR-NOT: notify batch students that new material was published.
    await notifyBatchStudents(courseId, {
      title: "New material added",
      message: `A new ${parsed.data.type.toLowerCase()} "${parsed.data.title}" was added to your course.`,
    });
  } else {
    // Queue for admin review instead of publishing immediately.
    await notifyAdmins({
      title: "Content awaiting approval",
      message: `${user.name} submitted "${parsed.data.title}" for review.`,
    });
    revalidatePath("/admin/approvals");
  }

  contentPaths(courseId);
  return { ok: true, id: resource.id };
}

export async function deleteResource(id: string): Promise<ActionResult> {
  const resource = await db.resource.findUnique({
    where: { id },
    select: { chapter: { select: { courseId: true } } },
  });
  if (!resource) return { ok: false, error: "Resource not found" };
  const courseId = resource.chapter.courseId;
  // Reuse the same authorization gate (capability-aware for admin-area roles).
  await assertCanManageCourse(courseId);
  await db.resource.delete({ where: { id } });
  contentPaths(courseId);
  return { ok: true };
}

// Presigned upload for content (admin/teacher). Null if storage unconfigured.
export async function getContentUploadUrl(input: {
  chapterId: string;
  fileName: string;
  contentType: string;
}): Promise<{ ok: boolean; url?: string; fileKey?: string; error?: string }> {
  const courseId = await courseIdForChapter(input.chapterId);
  if (!courseId) return { ok: false, error: "Chapter not found" };
  await assertCanManageCourse(courseId);

  const safe = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  const fileKey = `content/${courseId}/${input.chapterId}/${Date.now()}-${safe}`;
  const url = await getSignedUploadUrl(fileKey, input.contentType);
  if (!url) return { ok: false, error: "File uploads aren't configured — paste a URL instead" };
  return { ok: true, url, fileKey };
}
