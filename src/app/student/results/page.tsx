import type { Metadata } from "next";
import { Award } from "lucide-react";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Results" };

// FR-ST-04/04c: admin-entered results appear here ONLY after publish.
export default async function StudentResultsPage() {
  const user = await requireRole("STUDENT");
  const results = await db.result.findMany({
    where: { studentId: user.id, publishedAt: { not: null } },
    orderBy: [{ examDate: "desc" }, { createdAt: "desc" }],
  });

  // Group by exam for a per-exam card view.
  const byExam = new Map<string, typeof results>();
  for (const r of results) {
    const list = byExam.get(r.examName) ?? [];
    list.push(r);
    byExam.set(r.examName, list);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 lg:p-8">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Results</h1>
        <p className="mt-1 text-sm text-muted-foreground">Published exam results.</p>
      </div>

      {results.length === 0 ? (
        <EmptyState icon={Award} title="No published results yet" description="Results appear here once your institute publishes them." />
      ) : (
        [...byExam.entries()].map(([exam, rows]) => (
          <Card key={exam} className="border-none shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">{exam}</CardTitle>
              {rows[0]?.examDate ? (
                <p className="text-xs text-muted-foreground">{formatDate(rows[0].examDate)}</p>
              ) : null}
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-2.5 text-sm">
                    <span className="text-slate-700">{r.subject ?? "Overall"}</span>
                    <span className="font-medium text-slate-900">
                      {r.marksObtained}/{r.maxMarks}
                      {r.grade ? (
                        <span className="ml-2 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">{r.grade}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
