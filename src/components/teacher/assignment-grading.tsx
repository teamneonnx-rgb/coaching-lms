"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileText, Loader2, Check, Inbox, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { gradeAssignmentSubmission, getAssignmentFileUrl, deleteAssignment } from "@/lib/actions/assignments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/empty-state";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";

type Submission = {
  id: string;
  studentName: string;
  studentEmail: string;
  status: "SUBMITTED" | "GRADED";
  score: number | null;
  feedback: string | null;
  text: string | null;
  hasFile: boolean;
  isLate: boolean;
  submittedAt: string;
};

export function AssignmentGrading({
  assignmentId,
  totalMarks,
  submissions,
}: {
  assignmentId: string;
  totalMarks: number;
  submissions: Submission[];
}) {
  const router = useRouter();
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{submissions.length} submission(s) · out of {totalMarks}</p>
        <ConfirmDeleteDialog
          title="Delete assignment"
          description="Delete this assignment and all its submissions?"
          onConfirm={async () => {
            const r = await deleteAssignment(assignmentId);
            if (r.ok) router.push("/teacher/assignments");
            return r;
          }}
          trigger={
            <Button variant="ghost" size="icon-sm" aria-label="Delete assignment">
              <Trash2 className="size-4 text-destructive" />
            </Button>
          }
        />
      </div>
      {submissions.length === 0 ? (
        <EmptyState icon={Inbox} title="No submissions yet" />
      ) : (
        <ul className="space-y-3">
          {submissions.map((s) => <Row key={s.id} s={s} totalMarks={totalMarks} />)}
        </ul>
      )}
    </div>
  );
}

function Row({ s, totalMarks }: { s: Submission; totalMarks: number }) {
  const [isPending, start] = useTransition();
  const [score, setScore] = useState(s.score?.toString() ?? "");
  const [feedback, setFeedback] = useState(s.feedback ?? "");
  const [viewing, setViewing] = useState(false);

  function grade() {
    start(async () => {
      const r = await gradeAssignmentSubmission({ submissionId: s.id, score: Number(score), feedback });
      if (r.ok) toast.success("Graded");
      else toast.error(r.error ?? "Failed");
    });
  }
  function view() {
    setViewing(true);
    start(async () => {
      const r = await getAssignmentFileUrl(s.id);
      if (r.ok && r.url) window.open(r.url, "_blank", "noopener");
      else toast.error(r.error ?? "Could not open file");
      setViewing(false);
    });
  }

  return (
    <li className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">{s.studentName}</p>
          <p className="text-xs text-muted-foreground">{s.studentEmail}</p>
        </div>
        <div className="flex items-center gap-2">
          {s.isLate ? <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">Late</span> : null}
          <span className={s.status === "GRADED"
            ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
            : "rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700"}>
            {s.status === "GRADED" ? `Graded · ${s.score}/${totalMarks}` : "Awaiting grading"}
          </span>
        </div>
      </div>
      {s.text ? <p className="mt-3 whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm text-slate-700">{s.text}</p> : null}
      <div className="mt-3 space-y-3">
        {s.hasFile ? (
          <Button variant="outline" size="sm" onClick={view} disabled={isPending}>
            {viewing ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />} View file
          </Button>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
          <div className="grid gap-1.5">
            <Label className="text-xs">Score</Label>
            <Input type="number" min={0} max={totalMarks} value={score} onChange={(e) => setScore(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs">Feedback</Label>
            <Textarea rows={2} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <Button size="sm" onClick={grade} disabled={isPending || score === ""} className="bg-teal-600 text-white hover:bg-teal-600/90">
          {isPending && !viewing ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save grade
        </Button>
      </div>
    </li>
  );
}
