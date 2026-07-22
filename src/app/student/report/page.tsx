import type { Metadata } from "next";
import { CalendarCheck, BookOpen, ClipboardList, FileText, Layers } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { requireRole } from "@/lib/session";
import { getActiveBatch } from "@/lib/student";
import { getStudentReport } from "@/lib/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "My Report" };

function Metric({ icon: Icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub?: string }) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
            <Icon className="size-5" />
          </span>
          <div>
            <p className="text-2xl font-semibold text-slate-900">{value}</p>
            <p className="text-xs text-muted-foreground">{label}{sub ? ` · ${sub}` : ""}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const dash = (v: number | null) => (v === null ? "—" : `${v}%`);

export default async function StudentReportPage() {
  const user = await requireRole("STUDENT");
  const batch = await getActiveBatch(user.id);
  if (!batch) {
    return (
      <div className="p-4 lg:p-8">
        <EmptyState icon={Layers} title="No active batch" description="You aren't enrolled in a batch yet." />
      </div>
    );
  }

  const r = await getStudentReport(user.id, batch.id);

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">My Report</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your progress in {batch.name}.</p>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={CalendarCheck} label="Attendance" value={dash(r.attendancePct)} sub={`${r.attendanceMarked} days`} />
        <Metric icon={BookOpen} label="Content done" value={dash(r.completionPct)} sub={`${r.completed}/${r.totalResources}`} />
        <Metric icon={ClipboardList} label="Avg assessment" value={dash(r.assessmentAvg)} />
        <Metric icon={FileText} label="Avg assignment" value={dash(r.assignmentAvg)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardHeader><CardTitle className="text-base">Assessment scores</CardTitle></CardHeader>
          <CardContent>
            {r.assessments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No graded assessments yet.</p>
            ) : (
              <ul className="space-y-2">
                {r.assessments.map((a, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{a.title}</span>
                    <span className="font-medium text-slate-900">{a.score ?? "—"}{a.max ? `/${a.max}` : ""}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader><CardTitle className="text-base">Assignment scores</CardTitle></CardHeader>
          <CardContent>
            {r.assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground">No graded assignments yet.</p>
            ) : (
              <ul className="space-y-2">
                {r.assignments.map((a, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="text-slate-700">{a.title}</span>
                    <span className="font-medium text-slate-900">{a.score ?? "—"}/{a.max}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
