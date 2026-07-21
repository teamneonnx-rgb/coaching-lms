"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, Loader2, Check, Inbox } from "lucide-react";
import { toast } from "sonner";
import { gradeSubmission, getSubmissionFileUrl } from "@/lib/actions/assessments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";

type Submission = {
  id: string;
  studentName: string;
  studentEmail: string;
  status: "SUBMITTED" | "GRADED";
  score: number | null;
  maxScore: number | null;
  feedback: string | null;
  hasFile: boolean;
  submittedAt: string;
};

export function SubmissionsPanel({
  assessmentId,
  title,
  type,
  courseId,
  submissions,
}: {
  assessmentId: string;
  title: string;
  type: "OBJECTIVE" | "SUBJECTIVE";
  courseId: string;
  submissions: Submission[];
}) {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Link
        href={`/teacher/assessments?courseId=${courseId}&assessmentId=${assessmentId}`}
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-slate-900"
      >
        <ArrowLeft className="size-4" /> Back to editor
      </Link>
      <div>
        <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
        <p className="text-sm text-muted-foreground">
          {submissions.length} submission(s) · {type === "OBJECTIVE" ? "auto-graded" : "manual grading"}
        </p>
      </div>

      {submissions.length === 0 ? (
        <EmptyState icon={Inbox} title="No submissions yet" />
      ) : (
        <ul className="space-y-3">
          {submissions.map((s) => (
            <SubmissionRow key={s.id} submission={s} type={type} />
          ))}
        </ul>
      )}
    </div>
  );
}

function SubmissionRow({
  submission,
  type,
}: {
  submission: Submission;
  type: "OBJECTIVE" | "SUBJECTIVE";
}) {
  const [isPending, startTransition] = useTransition();
  const [score, setScore] = useState<string>(submission.score?.toString() ?? "");
  const [feedback, setFeedback] = useState<string>(submission.feedback ?? "");
  const [viewing, setViewing] = useState(false);

  function grade() {
    startTransition(async () => {
      const result = await gradeSubmission({ submissionId: submission.id, score: Number(score), feedback });
      if (result.ok) toast.success("Graded");
      else toast.error(result.error ?? "Failed");
    });
  }

  function viewFile() {
    setViewing(true);
    startTransition(async () => {
      const result = await getSubmissionFileUrl(submission.id);
      if (result.ok && result.url) window.open(result.url, "_blank", "noopener");
      else toast.error(result.error ?? "Could not open file");
      setViewing(false);
    });
  }

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">{submission.studentName}</p>
          <p className="text-xs text-muted-foreground">{submission.studentEmail}</p>
        </div>
        <span
          className={
            submission.status === "GRADED"
              ? "inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
              : "inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"
          }
        >
          {submission.status === "GRADED"
            ? `Graded${submission.score !== null ? ` · ${submission.score}${submission.maxScore ? "/" + submission.maxScore : ""}` : ""}`
            : "Awaiting grading"}
        </span>
      </div>

      {type === "SUBJECTIVE" ? (
        <div className="mt-3 space-y-3">
          {submission.hasFile ? (
            <Button type="button" variant="outline" size="sm" onClick={viewFile} disabled={isPending}>
              {viewing ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
              View submission
            </Button>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
            <div className="grid gap-1.5">
              <Label className="text-xs">Score</Label>
              <Input
                type="number"
                min={0}
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Feedback</Label>
              <Textarea
                rows={2}
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Optional feedback"
              />
            </div>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={grade}
            disabled={isPending || score === ""}
            className="bg-teal-600 text-white hover:bg-teal-600/90"
          >
            {isPending && !viewing ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Save grade
          </Button>
        </div>
      ) : null}
    </li>
  );
}
