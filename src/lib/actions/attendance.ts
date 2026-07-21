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

  // ── STUDENT: self-mark → PENDING teacher validation (FR-ATT-4) ──
  // No parent alert / admin notify yet; those fire when the teacher validates.
  if (user.role === "STUDENT") {
    const batch = await getActiveBatch(user.id);
    if (!batch) return { ok: false, error: "You are not enrolled in an active batch" };

    const existing = await db.attendance.findUnique({
      where: { userId_date_batchId: { userId: user.id, date, batchId: batch.id } },
    });

    if (existing) {
      if (existing.validatedById) {
        return { ok: false, error: "Today's attendance is already validated by your teacher" };
      }
      await db.attendance.update({
        where: { id: existing.id },
        data: { status, markedAt: new Date() },
      });
      revalidatePath("/student");
      revalidatePath("/student/attendance");
      return { ok: true, info: "Updated — awaiting teacher validation" };
    }

    await db.attendance.create({
      data: { userId: user.id, batchId: batch.id, date, status }, // validatedById stays null
    });
    revalidatePath("/student");
    revalidatePath("/student/attendance");
    return { ok: true, info: "Marked — awaiting teacher validation" };
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
      if (existing.status !== entry.status || !existing.validatedById) {
        const updated = await db.attendance.update({
          where: { id: existing.id },
          // Teacher-marked = validated on the spot (FR-ATT-4).
          data: {
            status: entry.status,
            markedAt: new Date(),
            validatedById: teacher.id,
            validatedAt: new Date(),
          },
        });
        attendanceId = updated.id;
        changed = true;
      } else {
        attendanceId = existing.id;
      }
    } else {
      const created = await db.attendance.create({
        data: {
          userId: entry.studentId,
          batchId,
          date,
          status: entry.status,
          validatedById: teacher.id,
          validatedAt: new Date(),
        },
      });
      attendanceId = created.id;
      changed = true;
    }

    if (changed) {
      await dispatchAttendanceAlert(attendanceId); // parent alert (FR-ATT-6)
      notified++;
    }
  }

  if (notified > 0) {
    await notifyAllAdmins({
      title: "Attendance recorded",
      message: `${teacher.name} recorded attendance for ${notified} student(s) on ${formatDate(date)}.`,
      type: "TEACHER_ATTENDANCE",
    });
  }

  revalidatePath("/teacher");
  revalidatePath("/teacher/attendance");
  return { ok: true, info: `Saved. ${notified} parent alert(s) dispatched.` };
}

/**
 * Teacher validates a student's self-marked (pending) attendance (FR-ATT-4).
 * On validation → parent alert (FR-ATT-6) + admin notification.
 */
export async function validateAttendance(attendanceId: string): Promise<ActionResult> {
  const teacher = await requireRole("TEACHER");

  const attendance = await db.attendance.findUnique({
    where: { id: attendanceId },
    include: { user: { select: { name: true } } },
  });
  if (!attendance || !attendance.batchId) return { ok: false, error: "Attendance not found" };
  if (!(await teacherOwnsBatch(teacher.id, attendance.batchId))) {
    return { ok: false, error: "You don't teach this batch" };
  }
  if (attendance.validatedById) return { ok: true, info: "Already validated" };

  await db.attendance.update({
    where: { id: attendanceId },
    data: { validatedById: teacher.id, validatedAt: new Date() },
  });

  await dispatchAttendanceAlert(attendanceId); // parent alert
  await notifyAllAdmins({
    title: "Attendance validated",
    message: `${teacher.name} validated ${attendance.user.name}'s attendance (${attendance.status.toLowerCase()}) for ${formatDate(attendance.date)}.`,
    type: "TEACHER_ATTENDANCE",
  });

  revalidatePath("/teacher/attendance");
  return { ok: true, info: "Validated — parent notified, admin recorded" };
}
