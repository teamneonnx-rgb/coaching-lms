"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { teacherOwnsBatch } from "@/lib/teacher";
import { parseDateOnly } from "@/lib/date";
import { batchAttendanceSchema } from "@/lib/validations/attendance";

export type ActionResult = { ok: boolean; error?: string; info?: string };

/**
 * FR-TE-11 / FR-AD-45: the batch TEACHER records daily student attendance and
 * submits it to Admin. Rows are created PENDING — not final, not visible to
 * students or parents, and not counted anywhere — until an Admin approves
 * them (FR-AD-44/47). No notifications fire at submission time (FR-AD-50 —
 * absent alerts fire on approval).
 *
 * Self-marking is gone: students no longer mark themselves, and teachers never
 * mark or approve their own attendance (FR-AD-04, FR-TE-15) — Admin records
 * teacher attendance in src/lib/actions/admin/attendance.ts.
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

  let submitted = 0;
  let locked = 0;
  for (const entry of entries) {
    if (!enrolledSet.has(entry.studentId)) continue;

    const existing = await db.attendance.findUnique({
      where: { userId_date_batchId: { userId: entry.studentId, date, batchId } },
    });

    if (existing) {
      // FR-AD-47: approved records are locked — only Admin can amend them.
      if (existing.approvalStatus !== "PENDING") {
        locked++;
        continue;
      }
      if (existing.status !== entry.status) {
        await db.attendance.update({
          where: { id: existing.id },
          data: { status: entry.status, markedAt: new Date(), markedById: teacher.id },
        });
        submitted++;
      }
    } else {
      await db.attendance.create({
        data: {
          userId: entry.studentId,
          batchId,
          date,
          status: entry.status,
          markedById: teacher.id,
          approvalStatus: "PENDING", // awaits Admin approval (FR-AD-45)
        },
      });
      submitted++;
    }
  }

  revalidatePath("/teacher");
  revalidatePath("/teacher/attendance");
  revalidatePath("/admin/attendance");
  return {
    ok: true,
    info:
      `Submitted for admin approval (${submitted} record(s)).` +
      (locked > 0 ? ` ${locked} already-approved record(s) were left unchanged.` : ""),
  };
}
