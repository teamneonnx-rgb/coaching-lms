import "server-only";
import { db } from "@/lib/db";
import { sendSms } from "@/lib/notifications/sms";
import { sendEmail } from "@/lib/notifications/email";

const STATUS_LABEL: Record<string, string> = {
  PRESENT: "present",
  ABSENT: "absent",
  LATE: "late",
  ON_LEAVE: "on leave",
};

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * Loads an attendance record and notifies the student's parent by SMS + Email
 * (FR-ATT-02). Called by the QStash worker, or directly in the local fallback.
 * Fetches fresh data by id so no PII travels in the queue payload.
 */
export async function sendParentAttendanceAlert(attendanceId: string): Promise<{
  ok: boolean;
  reason?: string;
}> {
  const attendance = await db.attendance.findUnique({
    where: { id: attendanceId },
    include: {
      user: {
        select: { name: true, role: true, parentName: true, parentPhone: true, parentEmail: true },
      },
      batch: { select: { name: true } },
    },
  });

  if (!attendance) return { ok: false, reason: "attendance not found" };
  if (attendance.user.role !== "STUDENT") return { ok: false, reason: "not a student" };

  const { user, batch } = attendance;
  const statusLabel = STATUS_LABEL[attendance.status] ?? attendance.status.toLowerCase();
  const dateLabel = formatDate(attendance.date);
  const batchLabel = batch ? ` (${batch.name})` : "";

  const smsBody = `Dear ${user.parentName ?? "Parent"}, your ward ${user.name} was marked ${statusLabel.toUpperCase()} on ${dateLabel}${batchLabel}. — Coaching Institute`;

  const emailHtml = `
    <div style="font-family:Inter,Arial,sans-serif;color:#0f172a">
      <h2 style="margin:0 0 8px">Attendance update</h2>
      <p>Dear ${user.parentName ?? "Parent"},</p>
      <p>This is to inform you that <strong>${user.name}</strong> was marked
      <strong>${statusLabel.toUpperCase()}</strong> on <strong>${dateLabel}</strong>${batchLabel}.</p>
      <p style="color:#64748b;font-size:13px">— Coaching Institute LMS</p>
    </div>`;

  const tasks: Promise<unknown>[] = [];
  if (user.parentPhone) tasks.push(sendSms({ to: user.parentPhone, body: smsBody }));
  if (user.parentEmail) {
    tasks.push(
      sendEmail({ to: user.parentEmail, subject: `Attendance: ${user.name} — ${statusLabel}`, html: emailHtml })
    );
  }

  if (tasks.length === 0) return { ok: false, reason: "no parent contact on file" };

  await Promise.allSettled(tasks);
  return { ok: true };
}
