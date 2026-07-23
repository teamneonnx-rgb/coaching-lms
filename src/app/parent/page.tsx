import type { Metadata } from "next";
import { Users, CalendarCheck, Award, IndianRupee } from "lucide-react";
import { requireRole } from "@/lib/session";
import { getParentChildren } from "@/lib/parent";
import { getStudentPayments, computeStatus } from "@/lib/payments";
import { formatDate } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Parent Portal" };

export default async function ParentDashboard() {
  const parent = await requireRole("PARENT");
  const children = await getParentChildren(parent.id);

  // FR-PA-03: fee status per ward — paid, pending, due dates, history.
  const feesByChild = new Map<string, Awaited<ReturnType<typeof getStudentPayments>>>();
  for (const c of children) {
    feesByChild.set(c.id, await getStudentPayments(c.id));
  }

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

                {/* FR-PA-03: ward fee status (read-only) */}
                {(feesByChild.get(c.id) ?? []).length > 0 ? (
                  <div>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <IndianRupee className="size-3.5" /> Fees
                    </p>
                    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                      {(feesByChild.get(c.id) ?? []).map((p) => {
                        const status = computeStatus(p);
                        return (
                          <li key={p.id} className="flex items-center justify-between px-3 py-2 text-sm">
                            <span className="min-w-0">
                              <span className="block truncate text-slate-700">{p.title}</span>
                              <span className="block text-xs text-muted-foreground">
                                ₹{p.amountPaid}/{p.amountDue}
                                {p.dueDate ? ` · due ${formatDate(p.dueDate)}` : ""}
                                {p.receiptNo ? ` · ${p.receiptNo}` : ""}
                              </span>
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                                status === "PAID"
                                  ? "bg-green-100 text-green-700"
                                  : status === "OVERDUE"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-amber-100 text-amber-700"
                              }`}
                            >
                              {status}
                            </span>
                          </li>
                        );
                      })}
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
