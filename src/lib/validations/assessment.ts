import { z } from "zod";

export const assessmentTypeEnum = z.enum(["OBJECTIVE", "SUBJECTIVE"]);
export const questionTypeEnum = z.enum(["MCQ", "TRUE_FALSE", "SINGLE_WORD", "LONG_ANSWER"]);

// One MCQ option. Exactly one option per MCQ question is flagged correct.
const optionSchema = z.object({
  id: z.string().optional(), // present when editing an existing option
  text: z.string().trim().min(1, "Option text is required").max(500),
  isCorrect: z.boolean(),
});

// A test question can be MCQ (options), TRUE_FALSE / SINGLE_WORD (a correct
// answer string), or LONG_ANSWER (teacher-evaluated, no auto-scoring).
const questionSchema = z
  .object({
    id: z.string().optional(),
    type: questionTypeEnum.default("MCQ"),
    text: z.string().trim().min(1, "Question text is required").max(1000),
    points: z.coerce.number().int().min(1, "Points must be at least 1").max(100),
    correctAnswer: z.string().trim().max(200).optional().or(z.literal("")),
    options: z.array(optionSchema).max(6).default([]),
  })
  .superRefine((q, ctx) => {
    if (q.type === "MCQ") {
      if (q.options.length < 2) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Add at least 2 options", path: ["options"] });
      } else if (q.options.filter((o) => o.isCorrect).length !== 1) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Mark exactly one correct option", path: ["options"] });
      }
    }
    if ((q.type === "TRUE_FALSE" || q.type === "SINGLE_WORD") && !q.correctAnswer?.trim()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Provide the correct answer", path: ["correctAnswer"] });
    }
  });

// Full builder save (create or update). SUBJECTIVE assessments have no questions.
export const assessmentSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().trim().min(2, "Title must be at least 2 characters").max(150),
    description: z.string().trim().max(1000).optional().or(z.literal("")),
    type: assessmentTypeEnum,
    courseId: z.string().min(1, "Select a course"),
    negativeMarking: z.coerce.number().min(0, "Cannot be negative").max(1, "Max 1 (100%)"),
    timeLimit: z.coerce.number().int().min(0).max(600).optional(),
    questions: z.array(questionSchema),
  })
  .refine((a) => a.type === "SUBJECTIVE" || a.questions.length >= 1, {
    message: "Objective tests need at least one question",
    path: ["questions"],
  });

export type AssessmentInput = z.infer<typeof assessmentSchema>;

// Student test submission — per question either a selected MCQ option or a
// free-text answer (true-false / single-word / long-answer).
export const objectiveSubmissionSchema = z.object({
  assessmentId: z.string().min(1),
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      selectedOptionId: z.string().min(1).nullable().optional(),
      studentAnswer: z.string().trim().max(5000).nullable().optional(),
    })
  ),
});
export type ObjectiveSubmissionInput = z.infer<typeof objectiveSubmissionSchema>;

// Teacher long-answer evaluation — marks + optional remark per long-answer.
export const evaluateLongAnswersSchema = z.object({
  submissionId: z.string().min(1),
  marks: z.array(
    z.object({
      answerId: z.string().min(1),
      marksAwarded: z.coerce.number().min(0),
      remark: z.string().trim().max(1000).optional().or(z.literal("")),
    })
  ).min(1),
});
export type EvaluateLongAnswersInput = z.infer<typeof evaluateLongAnswersSchema>;

// Admin override of a final mark (FR-AD-59).
export const overrideScoreSchema = z.object({
  submissionId: z.string().min(1),
  score: z.coerce.number().min(0),
  feedback: z.string().trim().max(1000).optional().or(z.literal("")),
});
export type OverrideScoreInput = z.infer<typeof overrideScoreSchema>;

// Student subjective submission — the uploaded scan's object key.
export const subjectiveSubmissionSchema = z.object({
  assessmentId: z.string().min(1),
  fileKey: z.string().min(1, "Upload your answer scan first"),
});
export type SubjectiveSubmissionInput = z.infer<typeof subjectiveSubmissionSchema>;

// Teacher grading a subjective submission.
export const gradeSubmissionSchema = z.object({
  submissionId: z.string().min(1),
  score: z.coerce.number().min(0, "Score cannot be negative"),
  feedback: z.string().trim().max(2000).optional().or(z.literal("")),
});
export type GradeSubmissionInput = z.infer<typeof gradeSubmissionSchema>;
