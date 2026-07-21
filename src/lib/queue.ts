import "server-only";
import { Client } from "@upstash/qstash";
import { sendParentAttendanceAlert } from "@/lib/notifications/attendance-alert";

// Async dispatch for parent alerts (SRD sequence step 3a). Keeps the attendance
// Server Action non-blocking (< 300ms, NFR-PERF-02): the DB insert is awaited,
// the notification is dispatched and returns immediately.

export function isQueueConfigured(): boolean {
  return Boolean(process.env.QSTASH_TOKEN && process.env.APP_URL);
}

export const ATTENDANCE_ALERT_PATH = "/api/jobs/attendance-alert";

export async function dispatchAttendanceAlert(attendanceId: string): Promise<void> {
  if (isQueueConfigured()) {
    // Production: enqueue on QStash → it calls our webhook worker.
    try {
      const client = new Client({ token: process.env.QSTASH_TOKEN! });
      await client.publishJSON({
        url: `${process.env.APP_URL}${ATTENDANCE_ALERT_PATH}`,
        body: { attendanceId },
        retries: 3,
      });
      return;
    } catch (err) {
      console.error("[queue] QStash publish failed, falling back to direct send", err);
      // fall through to direct dispatch
    }
  }

  // Local / no-queue fallback: fire-and-forget so the action still returns fast.
  void sendParentAttendanceAlert(attendanceId).catch((err) =>
    console.error("[queue fallback] parent alert failed", err)
  );
}
