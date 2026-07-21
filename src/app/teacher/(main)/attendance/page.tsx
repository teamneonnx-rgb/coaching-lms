import type { Metadata } from "next";
import { CalendarCheck, Layers, Users, ClipboardCheck } from "lucide-react";
import { requireRole } from "@/lib/session";
import {
  getTeacherBatches,
  teacherOwnsBatch,
  getBatchRoster,
  getPendingValidations,
} from "@/lib/teacher";
import { parseDateOnly, toDateInput, todayDateOnly, toDateInput as fmtDate } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { RosterSelector } from "@/components/teacher/roster-selector";
import { RosterForm } from "@/components/teacher/roster-form";
import { PendingValidations } from "@/components/teacher/pending-validations";

export const metadata: Metadata = { title: "Attendance" };

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
  const [roster, pending] = await Promise.all([
    owns ? getBatchRoster(batchId, parseDateOnly(dateStr)) : Promise.resolve([]),
    getPendingValidations(teacher.id),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Validate student self-marks, or mark the roster directly. Either way the parent is notified.
        </p>
      </div>

      {/* Pending student self-marks awaiting validation (FR-ATT-4) */}
      {pending.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardCheck className="size-4 text-amber-600" /> Pending validation ({pending.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PendingValidations
              items={pending.map((p) => ({
                id: p.id,
                studentName: p.user.name,
                studentEmail: p.user.email,
                batchName: p.batch?.name ?? "—",
                status: p.status,
                date: fmtDate(p.date),
              }))}
            />
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-slate-200">
        <CardContent className="p-4">
          <RosterSelector batches={batches} batchId={batchId} date={dateStr} />
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4 text-teal-600" /> Students ({roster.length})
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
