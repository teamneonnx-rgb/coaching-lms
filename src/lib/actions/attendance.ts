"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser, requireRole } from "@/lib/session";
import { getActiveBatch } from "@/lib/student";
import { teacherOwnsBatch } from "@/lib/teacher";
import { dispatchAttendanceAlert } from "@/lib/queue";
import { notifyAllAdmins } from "@/lib/notifications/admin-notify";
import { todayDateOnly, parseDateOnly, formatDate } from "@/lib/date";
import {
  markMyAttendanceSchema,
  batchAttendanceSchema,
} from "@/lib/validations/attendance";

export type ActionResult = { ok: boolean; error?: string; info?: string };

/**
 * Self check-in. STUDENT → async parent SMS/Email (FR-ATT-02).
 * TEACHER → bulk Notification insert for all admins (FR-ATT-03).
 * The DB insert is awaited; the parent alert is dispatched (non-blocking).
 */
export async function markMyAttendance(values: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = markMyAttendanceSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { status } = parsed.data;
  const date = todayDateOnly();

  // ── STUDENT: self-attendance → parent alert ──
  if (user.role === "STUDENT") {
    const batch = await getActiveBatch(user.id);
    if (!batch) return { ok: false, error: "You are not enrolled in an active batch" };

    const existing = await db.attendance.findUnique({
      where: { userId_date_batchId: { userId: user.id, date, batchId: batch.id } },
    });

    if (existing) {
      if (existing.status === status) {
        return { ok: true, info: "Attendance already marked for today" };
      }
      const updated = await db.attendance.update({
        where: { id: existing.id },
        data: { status, markedAt: new Date() },
      });
      await dispatchAttendanceAlert(updated.id); // step 3a
      revalidatePath("/student");
      revalidatePath("/student/attendance");
      return { ok: true, info: "Attendance updated" };
    }

    const created = await db.attendance.create({
      data: { userId: user.id, batchId: batch.id, date, status },
    });
    await dispatchAttendanceAlert(created.id); // step 3a
    revalidatePath("/student");
    revalidatePath("/student/attendance");
    return { ok: true };
  }

  // ── TEACHER: self-attendance → notify all admins ──
  if (user.role === "TEACHER") {
    // batchId is null for teacher self-attendance; NULLs aren't deduped by the
    // unique index, so guard duplicates explicitly.
    const existing = await db.attendance.findFirst({
      where: { userId: user.id, date, batchId: null },
    });
    if (existing) {
      if (existing.status !== status) {
        await db.attendance.update({
          where: { id: existing.id },
          data: { status, markedAt: new Date() },
        });
      }
      return { ok: true, info: "Attendance already marked for today" };
    }

    await db.attendance.create({
      data: { userId: user.id, batchId: null, date, status },
    });
    // step 3b — bulk insert into Notification for all admins (FR-ATT-03)
    await notifyAllAdmins({
      title: "Teacher attendance",
      message: `${user.name} marked themselves ${status} on ${formatDate(date)}.`,
      type: "TEACHER_ATTENDANCE",
    });
    revalidatePath("/teacher");
    revalidatePath("/admin");
    return { ok: true };
  }

  return { ok: false, error: "Admins do not mark attendance" };
}

/**
 * Teacher marks a batch roster for a date. Each recorded/changed student
 * triggers an async parent alert (FR-ATT-02). Teacher must own the batch.
 */
export async function saveBatchAttendance(values: unknown): Promise<ActionResult> {
  const teacher = await requireRole("TEACHER");
  const parsed = batchAttendanceSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { batchId, date: dateStr, entries } = parsed.data;

  if (!(await teacherOwnsBatch(teacher.id, batchId))) {
    return { ok: false, error: "You don't teach this batch" };
  }

  const date = parseDateOnly(dateStr);

  // Only mark students actually enrolled in this batch.
  const enrolled = await db.enrollment.findMany({
    where: { batchId, isActive: true, studentId: { in: entries.map((e) => e.studentId) } },
    select: { studentId: true },
  });
  const enrolledSet = new Set(enrolled.map((e) => e.studentId));

  let notified = 0;
  for (const entry of entries) {
    if (!enrolledSet.has(entry.studentId)) continue;

    const existing = await db.attendance.findUnique({
      where: { userId_date_batchId: { userId: entry.studentId, date, batchId } },
    });

    let changed = false;
    let attendanceId: string;

    if (existing) {
      if (existing.status !== entry.status) {
        const updated = await db.attendance.update({
          where: { id: existing.id },
          data: { status: entry.status, markedAt: new Date() },
        });
        attendanceId = updated.id;
        changed = true;
      } else {
        attendanceId = existing.id;
      }
    } else {
      const created = await db.attendance.create({
        data: { userId: entry.studentId, batchId, date, status: entry.status },
      });
      attendanceId = created.id;
      changed = true;
    }

    if (changed) {
      await dispatchAttendanceAlert(attendanceId); // step 3a per student
      notified++;
    }
  }

  revalidatePath("/teacher");
  revalidatePath("/teacher/attendance");
  return { ok: true, info: `Saved. ${notified} parent alert(s) dispatched.` };
}
