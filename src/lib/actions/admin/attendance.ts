"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { hasCapability } from "@/lib/capabilities";
import { dispatchAttendanceAlert } from "@/lib/queue";
import { logAudit } from "@/lib/audit";
import { parseDateOnly, todayDateOnly } from "@/lib/date";

export type ActionResult = { ok: boolean; error?: string; info?: string };

// Admin is the approval authority for ALL attendance (FR-AD-44). Student rows
// need STUDENT_ATTENDANCE_APPROVE, teacher rows need TEACHER_ATTENDANCE.
async function capabilityForRow(userRole: string) {
  return userRole === "TEACHER" ? ("TEACHER_ATTENDANCE" as const) : ("STUDENT_ATTENDANCE_APPROVE" as const);
}

const markTeacherSchema = z.object({
  teacherId: z.string().min(1),
  date: z.string().min(1),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "ON_LEAVE"]),
});

// FR-AD-01/04: Admin (not the teacher) records daily teacher attendance.
// Routed through the same approval queue (FR-AD-46).
export async function markTeacherAttendance(values: unknown): Promise<ActionResult> {
  const admin = await requireUser();
  if (!(await hasCapability(admin, "TEACHER_ATTENDANCE"))) {
    return { ok: false, error: "403 — missing capability TEACHER_ATTENDANCE" };
  }
  const parsed = markTeacherSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { teacherId, status } = parsed.data;
  const date = parsed.data.date ? parseDateOnly(parsed.data.date) : todayDateOnly();

  const teacher = await db.user.findFirst({
    where: { id: teacherId, role: "TEACHER", deletedAt: null },
    select: { id: true, name: true },
  });
  if (!teacher) return { ok: false, error: "Teacher not found" };

  // Teacher rows carry batchId null; NULLs escape the unique index, so dedupe manually.
  const existing = await db.attendance.findFirst({
    where: { userId: teacherId, date, batchId: null },
  });
  if (existing) {
    const before = { status: existing.status, approvalStatus: existing.approvalStatus };
    await db.attendance.update({
      where: { id: existing.id },
      data: {
        status,
        markedAt: new Date(),
        markedById: admin.id,
        // FR-AD-02: editing a past record is audited with before/after.
        ...(existing.approvalStatus !== "PENDING" ? { approvalStatus: "AMENDED" as const } : {}),
      },
    });
    await logAudit({
      actorId: admin.id, actorRole: admin.role, action: "attendance.teacher_edit",
      entity: "Attendance", entityId: existing.id, detail: teacher.name,
      beforeValue: JSON.stringify(before), afterValue: JSON.stringify({ status }),
    });
  } else {
    await db.attendance.create({
      data: {
        userId: teacherId, batchId: null, date, status,
        markedById: admin.id,
        approvalStatus: "PENDING", // FR-AD-46 — approval still required
      },
    });
  }

  revalidatePath("/admin/attendance");
  return { ok: true, info: `${teacher.name} marked ${status.toLowerCase().replace("_", " ")} — pending approval` };
}

// FR-AD-47/49/50: approve pending rows. Locks the record, publishes it to the
// relevant views, counts it toward percentages, and fires absent alerts to the
// student's parents — only now, never at submission.
export async function approveAttendance(ids: string[]): Promise<ActionResult> {
  const admin = await requireUser();
  if (!ids.length) return { ok: false, error: "Nothing to approve" };

  const rows = await db.attendance.findMany({
    where: { id: { in: ids }, approvalStatus: "PENDING" },
    include: { user: { select: { role: true, name: true } } },
  });
  if (rows.length === 0) return { ok: false, error: "No pending records found" };

  let approved = 0;
  for (const row of rows) {
    const cap = await capabilityForRow(row.user.role);
    if (!(await hasCapability(admin, cap))) continue; // skip rows this admin can't approve

    await db.attendance.update({
      where: { id: row.id },
      data: { approvalStatus: "APPROVED", validatedById: admin.id, validatedAt: new Date() },
    });
    approved++;

    // FR-AD-50: absent-marking notifies student + parents once approved.
    if (row.user.role === "STUDENT" && row.status === "ABSENT") {
      await dispatchAttendanceAlert(row.id);
    }
  }

  if (approved === 0) return { ok: false, error: "403 — missing the approval capability for these records" };

  await logAudit({
    actorId: admin.id, actorRole: admin.role, action: "attendance.approve",
    entity: "Attendance", detail: `${approved} record(s)`,
  });

  revalidatePath("/admin/attendance");
  revalidatePath("/student/attendance");
  revalidatePath("/teacher/attendance");
  return { ok: true, info: `Approved ${approved} record(s)` };
}

// FR-AD-49: one-action approval of a full batch-day.
export async function approveBatchDay(batchId: string, dateStr: string): Promise<ActionResult> {
  const date = parseDateOnly(dateStr);
  const rows = await db.attendance.findMany({
    where: { batchId, date, approvalStatus: "PENDING" },
    select: { id: true },
  });
  if (rows.length === 0) return { ok: false, error: "Nothing pending for that batch-day" };
  return approveAttendance(rows.map((r) => r.id));
}

const amendSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["PRESENT", "ABSENT", "LATE", "ON_LEAVE"]),
});

// FR-AD-48: Admin corrects a value before approving, or amends an approved
// record afterwards. Amendments are audit-logged with before/after values.
export async function amendAttendance(values: unknown): Promise<ActionResult> {
  const admin = await requireUser();
  const parsed = amendSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { id, status } = parsed.data;

  const row = await db.attendance.findUnique({
    where: { id },
    include: { user: { select: { role: true, name: true } } },
  });
  if (!row) return { ok: false, error: "Record not found" };

  const cap = await capabilityForRow(row.user.role);
  if (!(await hasCapability(admin, cap))) {
    return { ok: false, error: `403 — missing capability ${cap}` };
  }

  const wasApproved = row.approvalStatus !== "PENDING";
  await db.attendance.update({
    where: { id },
    data: {
      status,
      // Correcting a pending row keeps it pending; amending an approved row
      // marks it AMENDED (still counts as approved everywhere).
      ...(wasApproved
        ? { approvalStatus: "AMENDED" as const, validatedById: admin.id, validatedAt: new Date() }
        : {}),
    },
  });

  await logAudit({
    actorId: admin.id, actorRole: admin.role,
    action: wasApproved ? "attendance.amend" : "attendance.correct",
    entity: "Attendance", entityId: id, detail: row.user.name,
    beforeValue: JSON.stringify({ status: row.status, approvalStatus: row.approvalStatus }),
    afterValue: JSON.stringify({ status }),
  });

  revalidatePath("/admin/attendance");
  revalidatePath("/student/attendance");
  return { ok: true, info: wasApproved ? "Amended (audited)" : "Corrected" };
}
