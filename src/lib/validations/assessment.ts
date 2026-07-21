import { z } from "zod";

export const assessmentTypeEnum = z.enum(["OBJECTIVE", "SUBJECTIVE"]);

// One MCQ option. Exactly one option per question is flagged correct.
const optionSchema = z.object({
  id: z.string().optional(), // present when editing an existing option
  text: z.string().trim().min(1, "Option text is required").max(500),
  isCorrect: z.boolean(),
});

const questionSchema = z
  .object({
    id: z.string().optional(),
    text: z.string().trim().min(1, "Question text is required").max(1000),
    points: z.coerce.number().int().min(1, "Points must be at least 1").max(100),
    options: z.array(optionSchema).min(2, "Add at least 2 options").max(6),
  })
  .refine((q) => q.options.filter((o) => o.isCorrect).length === 1, {
    message: "Mark exactly one correct option",
    path: ["options"],
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

// Student objective submission — one selected option per question (or null).
export const objectiveSubmissionSchema = z.object({
  assessmentId: z.string().min(1),
  answers: z.array(
    z.object({
      questionId: z.string().min(1),
      selectedOptionId: z.string().min(1).nullable(),
    })
  ),
});
export type ObjectiveSubmissionInput = z.infer<typeof objectiveSubmissionSchema>;

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
