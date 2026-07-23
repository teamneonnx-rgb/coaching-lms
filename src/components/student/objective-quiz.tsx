"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { submitObjective } from "@/lib/actions/submissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

type QType = "MCQ" | "TRUE_FALSE" | "SINGLE_WORD" | "LONG_ANSWER";
type Question = {
  id: string;
  text: string;
  type: QType;
  points: number;
  options: { id: string; text: string }[];
};

export function ObjectiveQuiz({
  assessmentId,
  questions,
}: {
  assessmentId: string;
  questions: Question[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // MCQ answers keyed by question → optionId; text answers → string.
  const [mcq, setMcq] = useState<Record<string, string>>({});
  const [text, setText] = useState<Record<string, string>>({});

  const answered = questions.filter((q) =>
    q.type === "MCQ" ? !!mcq[q.id] : !!(text[q.id] && text[q.id].trim())
  ).length;
  const hasLong = questions.some((q) => q.type === "LONG_ANSWER");

  function submit() {
    startTransition(async () => {
      const payload = {
        assessmentId,
        answers: questions.map((q) =>
          q.type === "MCQ"
            ? { questionId: q.id, selectedOptionId: mcq[q.id] ?? null }
            : { questionId: q.id, studentAnswer: text[q.id] ?? null }
        ),
      };
      const result = await submitObjective(payload);
      if (result.ok) {
        toast.success(result.info ?? "Submitted");
        router.refresh();
      } else {
        toast.error(result.error ?? "Could not submit");
      }
    });
  }

  return (
    <div className="space-y-4">
      {questions.map((q, i) => (
        <Card key={q.id} className="border-none shadow-sm">
          <CardContent className="p-5">
            <div className="mb-3 flex items-start justify-between gap-3">
              <p className="font-medium text-slate-900">
                {i + 1}. {q.text}
              </p>
              <span className="shrink-0 text-xs text-muted-foreground">
                {q.points} pt{q.points > 1 ? "s" : ""}
                {q.type === "LONG_ANSWER" ? " · teacher-marked" : ""}
              </span>
            </div>

            {q.type === "MCQ" ? (
              <RadioGroup
                value={mcq[q.id] ?? ""}
                onValueChange={(v) => setMcq((p) => ({ ...p, [q.id]: v }))}
                className="space-y-1.5"
              >
                {q.options.map((o) => (
                  <Label
                    key={o.id}
                    htmlFor={o.id}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 font-normal hover:bg-slate-50 has-[[data-state=checked]]:border-orange-300 has-[[data-state=checked]]:bg-orange-50"
                  >
                    <RadioGroupItem id={o.id} value={o.id} />
                    <span className="text-sm text-slate-700">{o.text}</span>
                  </Label>
                ))}
              </RadioGroup>
            ) : q.type === "TRUE_FALSE" ? (
              <RadioGroup
                value={text[q.id] ?? ""}
                onValueChange={(v) => setText((p) => ({ ...p, [q.id]: v }))}
                className="space-y-1.5"
              >
                {["true", "false"].map((v) => (
                  <Label
                    key={v}
                    htmlFor={`${q.id}-${v}`}
                    className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 font-normal capitalize hover:bg-slate-50 has-[[data-state=checked]]:border-orange-300 has-[[data-state=checked]]:bg-orange-50"
                  >
                    <RadioGroupItem id={`${q.id}-${v}`} value={v} />
                    <span className="text-sm text-slate-700">{v}</span>
                  </Label>
                ))}
              </RadioGroup>
            ) : q.type === "SINGLE_WORD" ? (
              <Input
                placeholder="Your answer"
                value={text[q.id] ?? ""}
                onChange={(e) => setText((p) => ({ ...p, [q.id]: e.target.value }))}
                className="max-w-xs"
              />
            ) : (
              <Textarea
                rows={4}
                placeholder="Write your answer…"
                value={text[q.id] ?? ""}
                onChange={(e) => setText((p) => ({ ...p, [q.id]: e.target.value }))}
              />
            )}
          </CardContent>
        </Card>
      ))}

      <div className="sticky bottom-0 flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
        <p className="text-sm text-muted-foreground">
          {answered}/{questions.length} answered
          {hasLong ? " · long answers marked by your teacher" : ""}
        </p>
        <Button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="bg-orange-500 text-white hover:bg-orange-500/90"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Submit test
        </Button>
      </div>
    </div>
  );
}
