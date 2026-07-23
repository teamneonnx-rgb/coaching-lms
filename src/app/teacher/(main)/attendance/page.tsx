import type { Metadata } from "next";
import { CalendarCheck, Layers, Users } from "lucide-react";
import { requireRole } from "@/lib/session";
import {
  getTeacherBatches,
  teacherOwnsBatch,
  getBatchRoster,
} from "@/lib/teacher";
import { parseDateOnly, toDateInput, todayDateOnly } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { RosterSelector } from "@/components/teacher/roster-selector";
import { RosterForm } from "@/components/teacher/roster-form";

export const metadata: Metadata = { title: "Attendance" };

// FR-TE-11/12: the teacher records the roster and SUBMITS it to Admin. Rows
// stay pending (badges below) until Admin approves; students and parents see
// nothing until then. Teachers no longer validate or self-mark (FR-TE-15).
export default async function TeacherAttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ batchId?: string; date?: string }>;
}) {
  const teacher = await requireRole("TEACHER");
  const batches = await getTeacherBatches(teacher.id);

  if (batches.length === 0) {
    return (
      <div>
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">Mark attendance</h1>
        <EmptyState
          icon={Layers}
          title="No batches assigned"
          description="You aren't teaching any batch yet. Ask an admin to assign you a course."
        />
      </div>
    );
  }

  const sp = await searchParams;
  const batchId = sp.batchId && batches.some((b) => b.id === sp.batchId) ? sp.batchId : batches[0].id;
  const dateStr = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : toDateInput(todayDateOnly());

  const owns = await teacherOwnsBatch(teacher.id, batchId);
  const roster = owns ? await getBatchRoster(batchId, parseDateOnly(dateStr)) : [];
  const pendingCount = roster.filter((r) => r.approvalStatus === "PENDING").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Record the roster and submit — records go live for students and parents once the admin approves them.
        </p>
      </div>

      <Card className="border-slate-200">
        <CardContent className="p-4">
          <RosterSelector batches={batches} batchId={batchId} date={dateStr} />
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-teal-600" /> Students ({roster.length})
            {pendingCount > 0 ? (
              <span className="ml-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-normal text-amber-700">
                {pendingCount} awaiting admin approval
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {roster.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="No students enrolled"
              description="This batch has no active students to mark."
            />
          ) : (
            <RosterForm batchId={batchId} date={dateStr} students={roster} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
