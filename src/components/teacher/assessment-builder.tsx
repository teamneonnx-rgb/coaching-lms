"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { Plus, Save, Loader2, Trash2, Send, Eye, ListChecks } from "lucide-react";
import { toast } from "sonner";
import {
  saveAssessment,
  publishAssessment,
  deleteAssessment,
} from "@/lib/actions/assessments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { QuestionField } from "@/components/teacher/question-field";

export type BuilderValues = {
  title: string;
  description: string;
  type: "OBJECTIVE" | "SUBJECTIVE";
  courseId: string;
  negativeMarking: number;
  timeLimit: number; // 0 = no limit
  questions: {
    type: "MCQ" | "TRUE_FALSE" | "SINGLE_WORD" | "LONG_ANSWER";
    text: string;
    points: number;
    correctAnswer?: string;
    options: { text: string; isCorrect: boolean }[];
  }[];
};

type ExistingAssessment = {
  id: string;
  title: string;
  description: string | null;
  type: "OBJECTIVE" | "SUBJECTIVE";
  courseId: string;
  negativeMarking: number;
  timeLimit: number | null;
  isPublished: boolean;
  submissionCount: number;
  questions: BuilderValues["questions"];
};

const emptyQuestion = () => ({
  type: "MCQ" as const,
  text: "",
  points: 1,
  correctAnswer: "",
  options: [
    { text: "", isCorrect: true },
    { text: "", isCorrect: false },
  ],
});

export function AssessmentBuilder({
  courses,
  defaultCourseId,
  assessment,
}: {
  courses: { id: string; title: string }[];
  defaultCourseId: string;
  assessment: ExistingAssessment | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [publishing, setPublishing] = useState(false);
  const locked = (assessment?.submissionCount ?? 0) > 0;

  const form = useForm<BuilderValues>({
    defaultValues: assessment
      ? {
          title: assessment.title,
          description: assessment.description ?? "",
          type: assessment.type,
          courseId: assessment.courseId,
          negativeMarking: assessment.negativeMarking,
          timeLimit: assessment.timeLimit ?? 0,
          questions: assessment.questions.length ? assessment.questions : [emptyQuestion()],
        }
      : {
          title: "",
          description: "",
          type: "OBJECTIVE",
          courseId: defaultCourseId,
          negativeMarking: 0,
          timeLimit: 0,
          questions: [emptyQuestion()],
        },
  });

  const { register, control, handleSubmit, watch } = form;
  const { fields, append, remove } = useFieldArray({ control, name: "questions" });
  const type = watch("type");

  function onSubmit(values: BuilderValues) {
    const payload = {
      id: assessment?.id,
      title: values.title,
      description: values.description,
      type: values.type,
      courseId: values.courseId,
      negativeMarking: values.type === "OBJECTIVE" ? Number(values.negativeMarking) : 0,
      timeLimit: Number(values.timeLimit) || 0,
      questions: values.type === "OBJECTIVE" ? values.questions : [],
    };
    startTransition(async () => {
      const result = await saveAssessment(payload);
      if (result.ok) {
        toast.success(result.info ?? "Saved");
        if (!assessment && result.id) {
          router.push(`/teacher/assessments?courseId=${values.courseId}&assessmentId=${result.id}`);
        } else {
          router.refresh();
        }
      } else {
        toast.error(result.error ?? "Could not save");
      }
    });
  }

  function togglePublish() {
    if (!assessment) return;
    setPublishing(true);
    startTransition(async () => {
      const result = await publishAssessment(assessment.id, !assessment.isPublished);
      if (result.ok) {
        toast.success(result.info ?? "Done");
        router.refresh();
      } else {
        toast.error(result.error ?? "Failed");
      }
      setPublishing(false);
    });
  }

  return (
    <FormProvider {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="mx-auto max-w-3xl space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-xl font-semibold text-slate-900">
            {assessment ? "Edit assessment" : "New assessment"}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            {assessment ? (
              <>
                <Button asChild variant="outline" size="sm">
                  <Link href={`/teacher/assessments?courseId=${assessment.courseId}&assessmentId=${assessment.id}&tab=submissions`}>
                    <Eye className="size-4" /> Submissions
                  </Link>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={togglePublish}
                  disabled={isPending}
                >
                  {publishing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  {assessment.isPublished ? "Unpublish" : "Publish"}
                </Button>
                <ConfirmDeleteDialog
                  title="Delete assessment"
                  description={`Delete "${assessment.title}"? All questions and submissions will be removed.`}
                  onConfirm={async () => {
                    const r = await deleteAssessment(assessment.id);
                    if (r.ok) router.push(`/teacher/assessments?courseId=${assessment.courseId}`);
                    return r;
                  }}
                  trigger={
                    <Button type="button" variant="ghost" size="icon-sm" aria-label="Delete">
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  }
                />
              </>
            ) : null}
            <Button type="submit" disabled={isPending} className="bg-teal-600 text-white hover:bg-teal-600/90">
              {isPending && !publishing ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save
            </Button>
          </div>
        </div>

        {assessment?.isPublished ? (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
            Published — students in the batch can take this assessment.
          </p>
        ) : null}
        {locked ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Students have submitted — questions are locked. You can still edit details.
          </p>
        ) : null}

        {/* Metadata */}
        <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid gap-1.5">
            <Label>Title</Label>
            <Input placeholder="e.g. Chapter 1 Quiz" {...register("title", { required: true })} />
          </div>
          <div className="grid gap-1.5">
            <Label>Description</Label>
            <Textarea rows={2} placeholder="Optional instructions" {...register("description")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>Course</Label>
              <Select value={watch("courseId")} onValueChange={(v) => form.setValue("courseId", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select course" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select
                value={type}
                onValueChange={(v) => form.setValue("type", v as BuilderValues["type"])}
              >
                <SelectTrigger className="w-full" disabled={!!assessment}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OBJECTIVE">Question-based test (MCQ / true-false / word / long-answer)</SelectItem>
                  <SelectItem value="SUBJECTIVE">Upload-based (student uploads a scan)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {type === "OBJECTIVE" ? (
              <div className="grid gap-1.5">
                <Label>Negative marking (0–1)</Label>
                <Input
                  type="number"
                  step="0.05"
                  min={0}
                  max={1}
                  placeholder="e.g. 0.25"
                  {...register("negativeMarking")}
                />
                <span className="text-xs text-muted-foreground">
                  Fraction of points deducted per wrong answer.
                </span>
              </div>
            ) : null}
            <div className="grid gap-1.5">
              <Label>Time limit (minutes)</Label>
              <Input type="number" min={0} placeholder="0 = no limit" {...register("timeLimit")} />
            </div>
          </div>
        </div>

        {/* Questions (objective only) */}
        {type === "OBJECTIVE" ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <ListChecks className="size-4" /> Questions ({fields.length})
              </h2>
              <Button
                type="button"
                size="sm"
                disabled={locked}
                onClick={() => append(emptyQuestion())}
                className="bg-teal-600 text-white hover:bg-teal-600/90"
              >
                <Plus className="size-4" /> Add Question
              </Button>
            </div>
            {fields.map((field, index) => (
              <QuestionField
                key={field.id}
                control={control}
                qIndex={index}
                disabled={locked}
                onRemove={() => remove(index)}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-lg border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-muted-foreground">
            Subjective test — students upload a PDF/image scan, which you grade manually
            from the Submissions tab.
          </p>
        )}
      </form>
    </FormProvider>
  );
}
