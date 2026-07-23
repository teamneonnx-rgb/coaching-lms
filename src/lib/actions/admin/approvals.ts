"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/capabilities";
import { notifyBatchStudents, notifyUser } from "@/lib/notifications/events";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: boolean; error?: string; info?: string };

async function loadPending(resourceId: string) {
  return db.resource.findFirst({
    where: { id: resourceId, approvalStatus: "PENDING" },
    select: {
      id: true,
      title: true,
      type: true,
      chapter: { select: { course: { select: { id: true, teacherId: true } } } },
    },
  });
}

// Approve teacher-submitted content → visible to students, teacher notified,
// batch students notified it was published (FR-APR).
export async function approveResource(resourceId: string): Promise<ActionResult> {
  const admin = await requireCapability("DOCUMENT_APPROVE");
  const resource = await loadPending(resourceId);
  if (!resource) return { ok: false, error: "Not found or already reviewed" };

  await db.resource.update({
    where: { id: resourceId },
    data: { approvalStatus: "APPROVED", reviewedById: admin.id, reviewedAt: new Date() },
  });

  const courseId = resource.chapter.course.id;
  await Promise.all([
    notifyUser(resource.chapter.course.teacherId, {
      title: "Content approved",
      message: `Your material "${resource.title}" was approved and is now live.`,
    }),
    notifyBatchStudents(courseId, {
      title: "New material added",
      message: `A new ${resource.type.toLowerCase()} "${resource.title}" was added to your course.`,
    }),
    logAudit({ actorId: admin.id, actorRole: admin.role, action: "resource.approve", entity: "Resource", entityId: resourceId, detail: resource.title }),
  ]);

  revalidatePath("/admin/approvals");
  revalidatePath(`/teacher/content/${courseId}`);
  revalidatePath("/student/courses");
  return { ok: true, info: "Approved" };
}

// Reject content → stays hidden from students; teacher notified so they can fix/remove.
export async function rejectResource(resourceId: string): Promise<ActionResult> {
  const admin = await requireCapability("DOCUMENT_APPROVE");
  const resource = await loadPending(resourceId);
  if (!resource) return { ok: false, error: "Not found or already reviewed" };

  await db.resource.update({
    where: { id: resourceId },
    data: { approvalStatus: "REJECTED", reviewedById: admin.id, reviewedAt: new Date() },
  });

  const courseId = resource.chapter.course.id;
  await Promise.all([
    notifyUser(resource.chapter.course.teacherId, {
      title: "Content rejected",
      message: `Your material "${resource.title}" was not approved. Please review and re-submit.`,
    }),
    logAudit({ actorId: admin.id, actorRole: admin.role, action: "resource.reject", entity: "Resource", entityId: resourceId, detail: resource.title }),
  ]);

  revalidatePath("/admin/approvals");
  revalidatePath(`/teacher/content/${courseId}`);
  return { ok: true, info: "Rejected" };
}
