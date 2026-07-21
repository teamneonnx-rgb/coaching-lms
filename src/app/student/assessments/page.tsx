import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Layers, ListChecks, FileText, CheckCircle2, Clock } from "lucide-react";
import { requireRole } from "@/lib/session";
import { getActiveBatch } from "@/lib/student";
import { getStudentAssessments } from "@/lib/assessments";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Assessments" };

export default async function StudentAssessmentsPage() {
  const user = await requireRole("STUDENT");
  const batch = await getActiveBatch(user.id);

  if (!batch) {
    return (
      <div className="p-4 lg:p-8">
        <EmptyState icon={Layers} title="No active batch" description="You aren't enrolled in a batch yet." />
      </div>
    );
  }

  const assessments = await getStudentAssessments(user.id, batch.id);

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Assessments</h1>
        <p className="mt-1 text-sm text-muted-foreground">{batch.name}</p>
      </div>

      {assessments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No assessments yet"
          description="Your teachers haven't published any tests for this batch."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {assessments.map((a) => {
            const submission = a.submissions[0];
            const done = !!submission;
            const graded = submission?.status === "GRADED";
            return (
              <Link key={a.id} href={`/student/assessments/${a.id}`}>
                <Card className="h-full border-none shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="flex size-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                        {a.type === "OBJECTIVE" ? <ListChecks className="size-5" /> : <FileText className="size-5" />}
                      </span>
                      {done ? (
                        graded ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                            <CheckCircle2 className="size-3" />
                            {submission.score !== null ? `${submission.score}${submission.maxScore ? "/" + submission.maxScore : ""}` : "Graded"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                            <Clock className="size-3" /> Submitted
                          </span>
                        )
                      ) : null}
                    </div>
                    <p className="font-medium text-slate-900">{a.title}</p>
                    <p className="text-xs text-muted-foreground">{a.course.title}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {a.type === "OBJECTIVE" ? `${a._count.questions} questions` : "Upload answer"}
                      {a.timeLimit ? ` · ${a.timeLimit} min` : ""}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
