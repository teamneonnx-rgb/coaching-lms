import type { Metadata } from "next";
import { CalendarCheck, Layers } from "lucide-react";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { getActiveBatch } from "@/lib/student";
import { getRecentAttendance } from "@/lib/teacher";
import { todayDateOnly, formatDate } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { SelfAttendanceCard } from "@/components/attendance/self-attendance-card";
import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";

export const metadata: Metadata = { title: "Attendance" };

export default async function StudentAttendancePage() {
  const user = await requireRole("STUDENT");
  const batch = await getActiveBatch(user.id);

  if (!batch) {
    return (
      <div className="p-4 lg:p-8">
        <EmptyState
          icon={Layers}
          title="No active batch"
          description="You haven't been enrolled in a batch yet."
        />
      </div>
    );
  }

  const [todayRecord, history] = await Promise.all([
    db.attendance.findUnique({
      where: {
        userId_date_batchId: {
          userId: user.id,
          date: todayDateOnly(),
          batchId: batch.id,
        },
      },
      select: { status: true },
    }),
    getRecentAttendance(user.id, 15),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">{batch.name}</p>
      </div>

      <SelfAttendanceCard currentStatus={todayRecord?.status ?? null} accent="orange" />

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Recent history</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <EmptyState icon={CalendarCheck} title="No attendance records yet" />
          ) : (
            <ul className="divide-y divide-slate-100">
              {history.map((h) => (
                <li key={h.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{formatDate(h.date)}</p>
                    {h.batch ? (
                      <p className="text-xs text-muted-foreground">{h.batch.name}</p>
                    ) : null}
                  </div>
                  <AttendanceStatusBadge status={h.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
