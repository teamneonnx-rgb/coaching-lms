import type { Metadata } from "next";
import { CalendarCheck, Layers } from "lucide-react";
import { requireRole } from "@/lib/session";
import { getActiveBatch } from "@/lib/student";
import { getRecentAttendance } from "@/lib/teacher";
import { formatDate } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";

export const metadata: Metadata = { title: "Attendance" };

// FR-ST-03 / FR-AD-45: read-only view of ADMIN-APPROVED attendance. Students
// no longer self-mark — the batch teacher records attendance and Admin
// approves it; pending records never appear here.
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

  const history = await getRecentAttendance(user.id, 30);
  const attended = history.filter((h) => h.status === "PRESENT" || h.status === "LATE").length;
  const pct = history.length > 0 ? Math.round((attended / history.length) * 100) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {batch.name}
          {pct !== null ? ` · ${pct}% over the last ${history.length} approved day(s)` : ""}
        </p>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Approved records</CardTitle>
        </CardHeader>
        <CardContent>
          {history.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="No approved attendance yet"
              description="Your teacher records attendance and the admin approves it before it appears here."
            />
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
