"use client";

import { useState } from "react";
import {
  useFieldArray,
  useFormContext,
  useWatch,
  type Control,
} from "react-hook-form";
import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import type { BuilderValues } from "@/components/teacher/assessment-builder";

const TYPE_LABEL: Record<string, string> = {
  MCQ: "Multiple choice",
  TRUE_FALSE: "True / False",
  SINGLE_WORD: "Single word",
  LONG_ANSWER: "Long answer (teacher-marked)",
};

export function QuestionField({
  control,
  qIndex,
  onRemove,
  disabled,
}: {
  control: Control<BuilderValues>;
  qIndex: number;
  onRemove: () => void;
  disabled?: boolean;
}) {
  const { register, setValue, getValues } = useFormContext<BuilderValues>();
  const { fields, append, remove } = useFieldArray({
    control,
    name: `questions.${qIndex}.options`,
  });

  // Grading checkbox (UI spec) — reveals the point-value input when checked.
  const initialPoints = getValues(`questions.${qIndex}.points`);
  const [customPoints, setCustomPoints] = useState<boolean>(Number(initialPoints) > 1);

  // Watch options to know which one is currently marked correct.
  const options = useWatch({ control, name: `questions.${qIndex}.options` }) ?? [];
  const correctIndex = options.findIndex((o) => o?.isCorrect);
  const qType = (useWatch({ control, name: `questions.${qIndex}.type` }) ?? "MCQ") as
    | "MCQ" | "TRUE_FALSE" | "SINGLE_WORD" | "LONG_ANSWER";
  const trueFalseValue = useWatch({ control, name: `questions.${qIndex}.correctAnswer` }) ?? "";

  function setCorrect(index: number) {
    const current = getValues(`questions.${qIndex}.options`) ?? [];
    current.forEach((_, i) =>
      setValue(`questions.${qIndex}.options.${i}.isCorrect`, i === index, {
        shouldValidate: true,
      })
    );
  }

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-start gap-2">
        <GripVertical className="mt-2 size-4 shrink-0 text-slate-300" />
        <div className="flex-1">
          <Label className="mb-1 text-xs text-muted-foreground">Question {qIndex + 1}</Label>
          <Textarea
            rows={2}
            placeholder="Enter the question"
            disabled={disabled}
            {...register(`questions.${qIndex}.text`)}
          />
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={onRemove}
          disabled={disabled}
          aria-label="Remove question"
        >
          <Trash2 className="size-4 text-destructive" />
        </Button>
      </div>

      {/* Question type selector */}
      <div className="mb-3 pl-6">
        <Label className="mb-1 text-xs text-muted-foreground">Type</Label>
        <Select
          value={qType}
          disabled={disabled}
          onValueChange={(v) => {
            setValue(`questions.${qIndex}.type`, v as typeof qType, { shouldValidate: true });
            if (v !== "MCQ") setValue(`questions.${qIndex}.correctAnswer`, v === "TRUE_FALSE" ? "true" : "", { shouldValidate: true });
          }}
        >
          <SelectTrigger className="h-8 w-64 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(["MCQ", "TRUE_FALSE", "SINGLE_WORD", "LONG_ANSWER"] as const).map((t) => (
              <SelectItem key={t} value={t}>{TYPE_LABEL[t]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grading checkbox → conditional point-value field (UI spec) */}
      <div className="mb-3 flex items-center gap-2 pl-6">
        <Checkbox
          id={`custom-points-${qIndex}`}
          checked={customPoints}
          disabled={disabled}
          onCheckedChange={(v) => {
            const next = v === true;
            setCustomPoints(next);
            if (!next) setValue(`questions.${qIndex}.points`, 1);
          }}
        />
        <Label htmlFor={`custom-points-${qIndex}`} className="text-sm font-normal">
          Custom points
        </Label>
        {customPoints ? (
          <Input
            type="number"
            min={1}
            max={100}
            className="ml-2 h-8 w-24"
            disabled={disabled}
            {...register(`questions.${qIndex}.points`)}
          />
        ) : (
          <span className="ml-1 text-xs text-muted-foreground">(1 point)</span>
        )}
      </div>

      {/* Answer input — depends on the question type */}
      {qType === "MCQ" ? (
        <div className="space-y-2 pl-6">
          <RadioGroup
            value={correctIndex >= 0 ? String(correctIndex) : undefined}
            onValueChange={(v) => setCorrect(Number(v))}
          >
            {fields.map((field, oIndex) => (
              <div key={field.id} className="flex items-center gap-2">
                <RadioGroupItem
                  value={String(oIndex)}
                  id={`q${qIndex}o${oIndex}`}
                  disabled={disabled}
                  aria-label="Mark correct"
                />
                <Input
                  placeholder={`Choice ${oIndex + 1}`}
                  className="h-8 flex-1"
                  disabled={disabled}
                  {...register(`questions.${qIndex}.options.${oIndex}.text`)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => remove(oIndex)}
                  disabled={disabled || fields.length <= 2}
                  aria-label="Remove choice"
                >
                  <Trash2 className="size-3.5 text-slate-400" />
                </Button>
              </div>
            ))}
          </RadioGroup>

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled || fields.length >= 6}
            onClick={() => append({ text: "", isCorrect: false })}
            className="border-teal-200 text-teal-700 hover:bg-teal-50"
          >
            <Plus className="size-3.5" /> Add choice
          </Button>
          <p className="text-xs text-muted-foreground">Select the radio to mark the correct answer.</p>
        </div>
      ) : qType === "TRUE_FALSE" ? (
        <div className="space-y-2 pl-6">
          <Label className="text-xs text-muted-foreground">Correct answer</Label>
          <RadioGroup
            value={trueFalseValue || "true"}
            onValueChange={(v) => setValue(`questions.${qIndex}.correctAnswer`, v, { shouldValidate: true })}
          >
            {["true", "false"].map((v) => (
              <div key={v} className="flex items-center gap-2">
                <RadioGroupItem value={v} id={`q${qIndex}tf${v}`} disabled={disabled} />
                <Label htmlFor={`q${qIndex}tf${v}`} className="text-sm font-normal capitalize">{v}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      ) : qType === "SINGLE_WORD" ? (
        <div className="space-y-1.5 pl-6">
          <Label className="text-xs text-muted-foreground">Correct answer (case-insensitive)</Label>
          <Input
            placeholder="e.g. Mitochondria"
            className="h-8 w-64"
            disabled={disabled}
            {...register(`questions.${qIndex}.correctAnswer`)}
          />
        </div>
      ) : (
        <p className="pl-6 text-xs text-muted-foreground">
          Long answers are marked by the teacher after submission — no answer key needed.
        </p>
      )}
    </div>
  );
}
