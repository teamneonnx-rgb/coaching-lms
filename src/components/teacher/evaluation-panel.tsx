"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { evaluateLongAnswers } from "@/lib/actions/submissions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export type EvalSubmission = {
  id: string;
  studentName: string;
  studentEmail: string;
  assessmentTitle: string;
  objectiveScore: number | null;
  maxScore: number | null;
  submittedAt: string;
  answers: { id: string; studentAnswer: string | null; questionText: string; points: number }[];
};

export function EvaluationPanel({ submission }: { submission: EvalSubmission }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState<Record<string, string>>({});

  const allMarked = submission.answers.every((a) => marks[a.id] !== undefined && marks[a.id] !== "");

  function submit() {
    start(async () => {
      const r = await evaluateLongAnswers({
        submissionId: submission.id,
        marks: submission.answers.map((a) => ({
          answerId: a.id,
          marksAwarded: Number(marks[a.id]),
          remark: remarks[a.id] ?? "",
        })),
      });
      if (r.ok) {
        toast.success(r.info ?? "Evaluated");
        router.refresh();
      } else {
        toast.error(r.error ?? "Failed");
      }
    });
  }

  return (
    <Card className="border-slate-200">
      <CardHeader>
        <CardTitle className="text-base">
          {submission.studentName}
          <span className="ml-2 text-xs font-normal text-muted-foreground">
            {submission.assessmentTitle} · objective {submission.objectiveScore ?? 0}
            {submission.maxScore != null ? ` / ${submission.maxScore} total` : ""}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {submission.answers.map((a, i) => (
          <div key={a.id} className="rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-medium text-slate-900">
              Q{i + 1}. {a.questionText}
              <span className="ml-2 text-xs font-normal text-muted-foreground">out of {a.points}</span>
            </p>
            <p className="mt-2 whitespace-pre-wrap rounded-md bg-slate-50 p-3 text-sm text-slate-700">
              {a.studentAnswer?.trim() ? a.studentAnswer : <span className="italic text-muted-foreground">No answer given</span>}
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-[8rem_1fr]">
              <div className="grid gap-1.5">
                <Label className="text-xs">Marks</Label>
                <Input
                  type="number" min={0} max={a.points}
                  value={marks[a.id] ?? ""}
                  onChange={(e) => setMarks((m) => ({ ...m, [a.id]: e.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Remark</Label>
                <Textarea rows={2} placeholder="Optional" value={remarks[a.id] ?? ""} onChange={(e) => setRemarks((r) => ({ ...r, [a.id]: e.target.value }))} />
              </div>
            </div>
          </div>
        ))}
        <Button onClick={submit} disabled={isPending || !allMarked} className="bg-teal-600 text-white hover:bg-teal-600/90">
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Submit evaluation
        </Button>
      </CardContent>
    </Card>
  );
}
