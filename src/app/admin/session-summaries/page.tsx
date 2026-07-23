import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BookOpenCheck } from "lucide-react";
import { requireAdminArea } from "@/lib/session";
import { hasCapability } from "@/lib/capabilities";
import { db } from "@/lib/db";
import { toDateInput, todayDateOnly, formatDate } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { SessionSummaryComposer } from "@/components/admin/session-summary-composer";

export const metadata: Metadata = { title: "Session summaries" };

// FR-AD-41..43: compose per-day class summaries; published straight to the
// profiles of every parent whose ward is in the batch (with a notification).
export default async function AdminSessionSummariesPage() {
  const user = await requireAdminArea();
  if (!(await hasCapability(user, "SESSION_SUMMARY_UPLOAD"))) redirect("/admin");

  const [batches, summaries] = await Promise.all([
    db.batch.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    db.classSessionSummary.findMany({
      orderBy: { sessionDate: "desc" },
      take: 30,
      include: { batch: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Class session summaries</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Publishing sends the summary to every parent of the batch.
        </p>
      </div>

      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-base">Compose</CardTitle></CardHeader>
        <CardContent>
          <SessionSummaryComposer batches={batches} today={toDateInput(todayDateOnly())} />
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-base">Recent summaries ({summaries.length})</CardTitle></CardHeader>
        <CardContent>
          {summaries.length === 0 ? (
            <EmptyState icon={BookOpenCheck} title="Nothing published yet" />
          ) : (
            <ul className="space-y-2">
              {summaries.map((s) => (
                <li key={s.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="text-sm font-medium text-slate-900">
                    {s.batch.name} · {formatDate(s.sessionDate)}
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{s.topicsCovered}</p>
                  {s.homework ? <p className="mt-1 text-xs text-muted-foreground">Homework: {s.homework}</p> : null}
                  {s.remarks ? <p className="text-xs text-muted-foreground">Remarks: {s.remarks}</p> : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
