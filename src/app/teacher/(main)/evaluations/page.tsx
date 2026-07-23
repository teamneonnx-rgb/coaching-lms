import type { Metadata } from "next";
import { ClipboardCheck } from "lucide-react";
import { requireRole } from "@/lib/session";
import { getPendingEvaluations } from "@/lib/assessments";
import { formatDate } from "@/lib/date";
import { EmptyState } from "@/components/empty-state";
import { EvaluationPanel } from "@/components/teacher/evaluation-panel";

export const metadata: Metadata = { title: "Evaluations" };

// FR-TE-13/14: long-answer evaluation queue, oldest first.
export default async function TeacherEvaluationsPage() {
  const teacher = await requireRole("TEACHER");
  const pending = await getPendingEvaluations(teacher.id);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Long-answer evaluations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Attempts awaiting your marking — oldest first ({pending.length}).
        </p>
      </div>

      {pending.length === 0 ? (
        <EmptyState icon={ClipboardCheck} title="Nothing to evaluate" description="Long answers from mixed tests will appear here." />
      ) : (
        <div className="space-y-5">
          {pending.map((s) => (
            <EvaluationPanel
              key={s.id}
              submission={{
                id: s.id,
                studentName: s.student.name ?? "Student",
                studentEmail: s.student.email,
                assessmentTitle: s.assessment.title,
                objectiveScore: s.objectiveScore,
                maxScore: s.maxScore,
                submittedAt: formatDate(s.submittedAt),
                answers: s.answers.map((a) => ({
                  id: a.id,
                  studentAnswer: a.studentAnswer,
                  questionText: a.question.text,
                  points: a.question.points,
                })),
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
