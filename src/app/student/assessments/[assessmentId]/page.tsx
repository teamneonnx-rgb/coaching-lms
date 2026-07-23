import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, XCircle, MinusCircle, Clock, Award } from "lucide-react";
import { requireRole } from "@/lib/session";
import { getActiveBatch } from "@/lib/student";
import { getAssessmentForStudent, getStudentSubmission } from "@/lib/assessments";
import { Card, CardContent } from "@/components/ui/card";
import { ObjectiveQuiz } from "@/components/student/objective-quiz";
import { SubjectiveUpload } from "@/components/student/subjective-upload";

export const metadata: Metadata = { title: "Assessment" };

export default async function TakeAssessmentPage({
  params,
}: {
  params: Promise<{ assessmentId: string }>;
}) {
  const { assessmentId } = await params;
  const user = await requireRole("STUDENT");
  const batch = await getActiveBatch(user.id);
  if (!batch) notFound();

  // Batch isolation + published check.
  const assessment = await getAssessmentForStudent(assessmentId, batch.id);
  if (!assessment) notFound();

  const submission = await getStudentSubmission(assessmentId, user.id);

  return (
    <div className="mx-auto max-w-3xl p-4 lg:p-8">
      <Link
        href="/student/assessments"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-slate-900"
      >
        <ArrowLeft className="size-4" /> Back to assessments
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{assessment.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {assessment.course.title}
          {assessment.timeLimit ? ` · ${assessment.timeLimit} min` : ""}
        </p>
        {assessment.description ? (
          <p className="mt-2 text-sm text-slate-600">{assessment.description}</p>
        ) : null}
      </div>

      {submission ? (
        <ResultView
          type={assessment.type}
          status={submission.status}
          evaluationStatus={submission.evaluationStatus}
          score={submission.score}
          objectiveScore={submission.objectiveScore}
          maxScore={submission.maxScore}
          feedback={submission.feedback}
          answers={submission.answers}
        />
      ) : assessment.type === "OBJECTIVE" ? (
        <ObjectiveQuiz assessmentId={assessment.id} questions={assessment.questions} />
      ) : (
        <SubjectiveUpload assessmentId={assessment.id} />
      )}
    </div>
  );
}

function ResultView({
  type,
  status,
  evaluationStatus,
  score,
  objectiveScore,
  maxScore,
  feedback,
  answers,
}: {
  type: "OBJECTIVE" | "SUBJECTIVE";
  status: "SUBMITTED" | "GRADED";
  evaluationStatus: "PARTIAL_AWAITING_EVALUATION" | "EVALUATED" | null;
  score: number | null;
  objectiveScore: number | null;
  maxScore: number | null;
  feedback: string | null;
  answers: { isCorrect: boolean | null }[];
}) {
  if (type === "SUBJECTIVE" && status === "SUBMITTED") {
    return (
      <Card className="border-none shadow-sm">
        <CardContent className="flex flex-col items-center gap-3 p-10 text-center">
          <Clock className="size-10 text-amber-500" />
          <p className="text-sm font-medium text-slate-900">Submitted for grading</p>
          <p className="text-sm text-muted-foreground">
            Your teacher will review your upload and post your score here.
          </p>
        </CardContent>
      </Card>
    );
  }

  // FR-ST-04b: mixed test with long answers still pending.
  if (evaluationStatus === "PARTIAL_AWAITING_EVALUATION") {
    const correctP = answers.filter((a) => a.isCorrect === true).length;
    const wrongP = answers.filter((a) => a.isCorrect === false).length;
    return (
      <div className="space-y-4">
        <Card className="border-none shadow-sm">
          <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
            <Clock className="size-9 text-amber-500" />
            <span className="rounded-full bg-amber-100 px-3 py-0.5 text-xs font-medium text-amber-700">
              Partial — awaiting evaluation
            </span>
            <p className="mt-1 text-2xl font-semibold text-slate-900">
              {objectiveScore ?? "—"}
              <span className="text-base text-muted-foreground"> objective marks so far</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Your long answers are with the teacher. Your final total will appear once they finish marking.
            </p>
          </CardContent>
        </Card>
        <div className="grid grid-cols-2 gap-3">
          <StatBox icon={CheckCircle2} tint="text-green-600" label="Objective correct" value={correctP} />
          <StatBox icon={XCircle} tint="text-red-600" label="Objective wrong" value={wrongP} />
        </div>
      </div>
    );
  }

  const correct = answers.filter((a) => a.isCorrect === true).length;
  const wrong = answers.filter((a) => a.isCorrect === false).length;
  const unanswered = answers.filter((a) => a.isCorrect === null).length;

  return (
    <div className="space-y-4">
      <Card className="border-none shadow-sm">
        <CardContent className="flex flex-col items-center gap-2 p-8 text-center">
          <Award className="size-10 text-orange-500" />
          <p className="text-3xl font-semibold text-slate-900">
            {score ?? "—"}
            {maxScore !== null ? <span className="text-lg text-muted-foreground"> / {maxScore}</span> : null}
          </p>
          <p className="text-sm text-muted-foreground">
            {status === "GRADED" ? "Your score" : "Awaiting grading"}
          </p>
        </CardContent>
      </Card>

      {type === "OBJECTIVE" ? (
        <div className="grid grid-cols-3 gap-3">
          <StatBox icon={CheckCircle2} tint="text-green-600" label="Correct" value={correct} />
          <StatBox icon={XCircle} tint="text-red-600" label="Wrong" value={wrong} />
          <StatBox icon={MinusCircle} tint="text-slate-400" label="Skipped" value={unanswered} />
        </div>
      ) : null}

      {feedback ? (
        <Card className="border-none shadow-sm">
          <CardContent className="p-5">
            <p className="mb-1 text-xs font-medium text-muted-foreground">Teacher feedback</p>
            <p className="text-sm text-slate-700">{feedback}</p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function StatBox({
  icon: Icon,
  tint,
  label,
  value,
}: {
  icon: typeof CheckCircle2;
  tint: string;
  label: string;
  value: number;
}) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="flex flex-col items-center gap-1 p-4">
        <Icon className={`size-5 ${tint}`} />
        <p className="text-xl font-semibold text-slate-900">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
