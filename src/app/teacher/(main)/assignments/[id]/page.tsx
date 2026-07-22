import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/session";
import { getAssignmentForGrading } from "@/lib/assignments";
import { formatDate } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AssignmentGrading } from "@/components/teacher/assignment-grading";

export const metadata: Metadata = { title: "Grade assignment" };

export default async function GradeAssignmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const teacher = await requireRole("TEACHER");
  const assignment = await getAssignmentForGrading(id, teacher.id);
  if (!assignment) notFound();

  const submissions = assignment.submissions.map((s) => ({
    id: s.id,
    studentName: s.student.name ?? "Student",
    studentEmail: s.student.email,
    status: s.status as "SUBMITTED" | "GRADED",
    score: s.score,
    feedback: s.feedback,
    text: s.text,
    hasFile: Boolean(s.fileKey),
    isLate: s.isLate,
    submittedAt: s.submittedAt.toISOString(),
  }));

  return (
    <div>
      <Link href="/teacher/assignments" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-slate-900">
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

      {assignment.instructions ? (
        <Card className="mb-6 border-slate-200">
          <CardHeader><CardTitle className="text-base">Instructions</CardTitle></CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm text-slate-700">{assignment.instructions}</p>
          </CardContent>
        </Card>
      ) : null}

      <Card className="border-slate-200">
        <CardHeader><CardTitle className="text-base">Submissions</CardTitle></CardHeader>
        <CardContent>
          <AssignmentGrading assignmentId={assignment.id} totalMarks={assignment.totalMarks} submissions={submissions} />
        </CardContent>
      </Card>
    </div>
  );
}
