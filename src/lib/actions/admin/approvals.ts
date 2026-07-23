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

// Reject content → stays hidden from students; teacher sees the reason and
// can fix + re-submit. FR-AD-38: rejection requires a reason.
export async function rejectResource(resourceId: string, reason?: string): Promise<ActionResult> {
  const admin = await requireCapability("DOCUMENT_APPROVE");
  if (!reason?.trim()) return { ok: false, error: "A rejection reason is required" };
  const resource = await loadPending(resourceId);
  if (!resource) return { ok: false, error: "Not found or already reviewed" };

  await db.resource.update({
    where: { id: resourceId },
    data: { approvalStatus: "REJECTED", reviewedById: admin.id, reviewedAt: new Date(), rejectionReason: reason.trim() },
  });

  const courseId = resource.chapter.course.id;
  await Promise.all([
    notifyUser(resource.chapter.course.teacherId, {
      title: "Content rejected",
      message: `Your material "${resource.title}" was not approved. Reason: ${reason.trim()}`,
    }),
    logAudit({ actorId: admin.id, actorRole: admin.role, action: "resource.reject", entity: "Resource", entityId: resourceId, detail: `${resource.title} — ${reason.trim()}` }),
  ]);

  revalidatePath("/admin/approvals");
  revalidatePath(`/teacher/content/${courseId}`);
  return { ok: true, info: "Rejected" };
}

// FR-AD-40: revoke approval on a previously approved document — it drops out
// of student view immediately and re-enters the approval queue.
export async function revokeResourceApproval(resourceId: string): Promise<ActionResult> {
  const admin = await requireCapability("DOCUMENT_APPROVE");
  const resource = await db.resource.findFirst({
    where: { id: resourceId, approvalStatus: "APPROVED" },
    select: { id: true, title: true, chapter: { select: { course: { select: { id: true, teacherId: true } } } } },
  });
  if (!resource) return { ok: false, error: "Not found or not approved" };

  await db.resource.update({
    where: { id: resourceId },
    data: { approvalStatus: "PENDING", reviewedById: admin.id, reviewedAt: new Date() },
  });

  await Promise.all([
    notifyUser(resource.chapter.course.teacherId, {
      title: "Approval revoked",
      message: `"${resource.title}" was pulled from student view and needs re-approval.`,
    }),
    logAudit({ actorId: admin.id, actorRole: admin.role, action: "resource.revoke", entity: "Resource", entityId: resourceId, detail: resource.title }),
  ]);

  revalidatePath("/admin/approvals");
  revalidatePath(`/teacher/content/${resource.chapter.course.id}`);
  revalidatePath("/student/courses");
  return { ok: true, info: "Approval revoked — hidden from students" };
}
