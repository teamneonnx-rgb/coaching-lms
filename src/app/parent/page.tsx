import type { Metadata } from "next";
import { Users, CalendarCheck, Award } from "lucide-react";
import { requireRole } from "@/lib/session";
import { getParentChildren } from "@/lib/parent";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Parent Portal" };

export default async function ParentDashboard() {
  const parent = await requireRole("PARENT");
  const children = await getParentChildren(parent.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Your children</h1>
        <p className="mt-1 text-sm text-muted-foreground">Attendance and marks (read-only).</p>
      </div>

      {children.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No linked students"
          description="Ask the institute to link your child's account to yours."
        />
      ) : (
        <div className="space-y-5">
          {children.map((c) => (
            <Card key={c.id} className="border-slate-200">
              <CardHeader>
                <CardTitle className="text-base">{c.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {c.batches.length ? c.batches.join(", ") : "No active batch"}
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-green-100 text-green-700">
                      <CalendarCheck className="size-5" />
                    </span>
                    <div>
                      <p className="text-lg font-semibold text-slate-900">
                        {c.attendancePct !== null ? `${c.attendancePct}%` : "—"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Attendance ({c.attendanceCount} records)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-orange-100 text-orange-700">
                      <Award className="size-5" />
                    </span>
                    <div>
                      <p className="text-lg font-semibold text-slate-900">{c.recentMarks.length}</p>
                      <p className="text-xs text-muted-foreground">Graded tests</p>
                    </div>
                  </div>
                </div>

                {c.recentMarks.length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Recent marks</p>
                    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                      {c.recentMarks.map((m, i) => (
                        <li key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                          <span className="text-slate-700">{m.title}</span>
                          <span className="font-medium text-slate-900">
                            {m.score ?? "—"}
                            {m.maxScore ? ` / ${m.maxScore}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
