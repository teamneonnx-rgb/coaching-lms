import type { Metadata } from "next";
import Link from "next/link";
import { Users, CalendarCheck, Award, IndianRupee } from "lucide-react";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { getParentChildren } from "@/lib/parent";
import { getStudentPayments, computeStatus } from "@/lib/payments";
import { formatDate } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { MonthlyFeedbackForm } from "@/components/parent/monthly-feedback-form";

export const metadata: Metadata = { title: "Parent Portal" };

export default async function ParentDashboard({
  searchParams,
}: {
  searchParams: Promise<{ ward?: string }>;
}) {
  const parent = await requireRole("PARENT");
  const allChildren = await getParentChildren(parent.id);
  const sp = await searchParams;

  // FR-PA-06: a parent with multiple wards switches between them; every screen
  // scopes to the selected ward.
  const activeWardId = allChildren.some((c) => c.id === sp.ward) ? sp.ward : allChildren[0]?.id;
  const children = allChildren.filter((c) => c.id === activeWardId);

  // FR-PA-03: fee status per ward — paid, pending, due dates, history.
  const feesByChild = new Map<string, Awaited<ReturnType<typeof getStudentPayments>>>();
  // FR-PA-02: published results; FR-PA-05: session summaries (view only);
  // FR-PA-01: once-per-month feedback flag.
  const period = new Date().toISOString().slice(0, 7);
  const resultsByChild = new Map<string, { examName: string; subject: string | null; marksObtained: number; maxMarks: number; grade: string | null }[]>();
  const summariesByChild = new Map<string, { batchName: string; sessionDate: Date; topicsCovered: string; homework: string | null }[]>();
  const feedbackDone = new Map<string, boolean>();
  for (const c of children) {
    feesByChild.set(c.id, await getStudentPayments(c.id));
    resultsByChild.set(
      c.id,
      await db.result.findMany({
        where: { studentId: c.id, publishedAt: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 8,
        select: { examName: true, subject: true, marksObtained: true, maxMarks: true, grade: true },
      })
    );
    summariesByChild.set(
      c.id,
      (
        await db.classSessionSummary.findMany({
          where: { batch: { enrollments: { some: { studentId: c.id, isActive: true } } } },
          orderBy: { sessionDate: "desc" },
          take: 5,
          include: { batch: { select: { name: true } } },
        })
      ).map((s) => ({ batchName: s.batch.name, sessionDate: s.sessionDate, topicsCovered: s.topicsCovered, homework: s.homework }))
    );
    feedbackDone.set(
      c.id,
      !!(await db.feedback.findFirst({
        where: { studentId: parent.id, givenByRole: "PARENT", wardId: c.id, period },
        select: { id: true },
      }))
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          {children[0]?.name ?? "Your children"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">Attendance, results, fees (read-only).</p>
      </div>

      {/* FR-PA-06: ward switcher */}
      {allChildren.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Ward:</span>
          {allChildren.map((c) => (
            <Link
              key={c.id}
              href={`/parent?ward=${c.id}`}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                c.id === activeWardId ? "bg-pink-500 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              }`}
            >
              {c.name}
            </Link>
          ))}
        </div>
      ) : null}

      {allChildren.length === 0 ? (
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

                {/* FR-PA-02: published results */}
                {(resultsByChild.get(c.id) ?? []).length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Published results</p>
                    <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
                      {(resultsByChild.get(c.id) ?? []).map((r, i) => (
                        <li key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                          <span className="text-slate-700">{r.examName}{r.subject ? ` · ${r.subject}` : ""}</span>
                          <span className="font-medium text-slate-900">
                            {r.marksObtained}/{r.maxMarks}{r.grade ? ` (${r.grade})` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* FR-PA-05: per-day class session summaries — view only */}
                {(summariesByChild.get(c.id) ?? []).length > 0 ? (
                  <div>
                    <p className="mb-2 text-xs font-medium text-muted-foreground">Class session summaries</p>
                    <ul className="space-y-1.5">
                      {(summariesByChild.get(c.id) ?? []).map((s, i) => (
                        <li key={i} className="rounded-lg border border-slate-200 px-3 py-2">
                          <p className="text-xs font-medium text-slate-900">{s.batchName} · {formatDate(s.sessionDate)}</p>
                          <p className="text-sm text-slate-700">{s.topicsCovered}</p>
                          {s.homework ? <p className="text-xs text-muted-foreground">Homework: {s.homework}</p> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {/* FR-PA-01: monthly feedback — once per calendar month per ward */}
                <MonthlyFeedbackForm wardId={c.id} alreadySubmitted={feedbackDone.get(c.id) ?? false} />

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
