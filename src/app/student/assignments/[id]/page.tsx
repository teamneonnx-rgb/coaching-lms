import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock } from "lucide-react";
import { requireRole } from "@/lib/session";
import { getActiveBatch } from "@/lib/student";
import { getAssignmentForStudent, getStudentAssignmentSubmission } from "@/lib/assignments";
import { formatDate } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { Layers } from "lucide-react";
import { AssignmentSubmit } from "@/components/student/assignment-submit";

export const metadata: Metadata = { title: "Assignment" };

export default async function StudentAssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireRole("STUDENT");
  const batch = await getActiveBatch(user.id);
  if (!batch) {
    return (
      <div className="p-4 lg:p-8">
        <EmptyState icon={Layers} title="No active batch" description="You aren't enrolled in a batch yet." />
      </div>
    );
  }

  const assignment = await getAssignmentForStudent(id, batch.id);
  if (!assignment) notFound();

  const submission = await getStudentAssignmentSubmission(assignment.id, user.id);
  const graded = submission?.status === "GRADED";

  return (
    <div className="p-4 lg:p-8">
      <Link href="/student/assignments" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-slate-900">
        <ArrowLeft className="size-4" /> Back to assignments
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{assignment.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {assignment.course.title}
          {assignment.dueDate ? ` · Due ${formatDate(assignment.dueDate)}` : ""}
          {` · ${assignment.totalMarks} marks`}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-none shadow-sm">
          <CardHeader><CardTitle className="text-base">Instructions</CardTitle></CardHeader>
          <CardContent>
            {assignment.instructions ? (
              <p className="whitespace-pre-wrap text-sm text-slate-700">{assignment.instructions}</p>
            ) : (
              <p className="text-sm text-muted-foreground">No instructions provided.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">
              {graded ? "Result" : submission ? "Your submission" : "Submit your work"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {submission ? (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${graded ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"}`}>
                {graded ? <CheckCircle2 className="size-4" /> : <Clock className="size-4" />}
                {graded
                  ? `Graded · ${submission.score}/${assignment.totalMarks}`
                  : `Submitted ${formatDate(submission.submittedAt)}${submission.isLate ? " (late)" : ""}`}
              </div>
            ) : null}

            {graded && submission?.feedback ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="mb-1 text-xs font-medium text-slate-500">Teacher feedback</p>
                <p className="whitespace-pre-wrap text-sm text-slate-700">{submission.feedback}</p>
              </div>
            ) : null}

            {graded ? null : (
              <AssignmentSubmit
                assignmentId={assignment.id}
                submissionType={assignment.submissionType}
                defaultText={submission?.text ?? ""}
                hasExisting={!!submission}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
