import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CalendarCheck, ClipboardCheck, Users } from "lucide-react";
import { requireAdminArea } from "@/lib/session";
import { hasCapability } from "@/lib/capabilities";
import { getPendingAttendance, getTeachersForMarking, getTeacherMonthlySummary } from "@/lib/attendance-admin";
import { toDateInput, todayDateOnly } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AttendanceApprovalQueue } from "@/components/admin/attendance-approval-queue";
import { TeacherAttendanceMarker } from "@/components/admin/teacher-attendance-marker";

export const metadata: Metadata = { title: "Attendance" };

// FR-AD-44..50: Admin is the approval authority for ALL attendance. One queue,
// grouped by date, split teacher/student, batch-day bulk approve. Admin also
// records teacher attendance here (FR-AD-01) and sees the monthly summary
// (FR-AD-03).
export default async function AdminAttendancePage() {
  const user = await requireAdminArea();
  const canStudents = await hasCapability(user, "STUDENT_ATTENDANCE_APPROVE");
  const canTeachers = await hasCapability(user, "TEACHER_ATTENDANCE");
  if (!canStudents && !canTeachers) redirect("/admin");

  const today = todayDateOnly();
  const [pending, teachers, summary] = await Promise.all([
    getPendingAttendance(),
    canTeachers ? getTeachersForMarking() : Promise.resolve([]),
    canTeachers ? getTeacherMonthlySummary(today.getUTCFullYear(), today.getUTCMonth()) : Promise.resolve([]),
  ]);

  // Only show rows this admin can act on.
  const visible = pending.filter((p) =>
    p.user.role === "TEACHER" ? canTeachers : canStudents
  );

  const rows = visible.map((p) => ({
    id: p.id,
    name: p.user.name ?? "User",
    role: p.user.role,
    status: p.status,
    date: toDateInput(p.date),
    dateLabel: p.date.toISOString().slice(0, 10),
    batchId: p.batch?.id ?? null,
    batchName: p.batch?.name ?? null,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          No record is final until you approve it. Absent alerts go out on approval.
        </p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="size-4 text-blue-600" /> Approval queue ({rows.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AttendanceApprovalQueue rows={rows} />
        </CardContent>
      </Card>

      {canTeachers ? (
        <>
          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="size-4 text-blue-600" /> Mark teacher attendance — today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <TeacherAttendanceMarker
                teachers={teachers.map((t) => ({
                  id: t.id,
                  name: t.name ?? "Teacher",
                  email: t.email,
                  today: t.today ? { status: t.today.status, approvalStatus: t.today.approvalStatus } : null,
                }))}
                date={toDateInput(today)}
              />
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CalendarCheck className="size-4 text-blue-600" /> Teacher summary — this month
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Teacher</TableHead>
                      <TableHead className="text-right">Present</TableHead>
                      <TableHead className="text-right">Absent</TableHead>
                      <TableHead className="text-right">On leave</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.map((s) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium text-slate-900">{s.name}</TableCell>
                        <TableCell className="text-right text-slate-600">{s.present}</TableCell>
                        <TableCell className="text-right text-slate-600">{s.absent}</TableCell>
                        <TableCell className="text-right text-slate-600">{s.onLeave}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  );
}
