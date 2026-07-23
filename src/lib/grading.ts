// Test engine grading (PRD FR-AD-56..59).
// MCQ / TRUE_FALSE / SINGLE_WORD auto-score instantly (with negative marking on
// wrong objective answers). LONG_ANSWER is routed to the teacher — it never
// auto-scores. A mixed test shows the objective score immediately and stays
// "partial — awaiting evaluation" until the teacher marks the long answers.

export type QuestionType = "MCQ" | "TRUE_FALSE" | "SINGLE_WORD" | "LONG_ANSWER";

export type GradableQuestion = {
  id: string;
  type: QuestionType;
  points: number;
  correctOptionId: string | null; // MCQ
  correctAnswer: string | null; // TRUE_FALSE / SINGLE_WORD
};

export type StudentAnswer = {
  questionId: string;
  selectedOptionId?: string | null; // MCQ
  studentAnswer?: string | null; // TRUE_FALSE / SINGLE_WORD / LONG_ANSWER
};

export type GradedAnswer = {
  questionId: string;
  selectedOptionId: string | null;
  studentAnswer: string | null;
  isCorrect: boolean | null; // null = not auto-scored (long answer) or unanswered
  marksAwarded: number | null; // null for long answers awaiting evaluation
  autoScored: boolean;
};

export type GradeResult = {
  objectiveScore: number; // marks from auto-scored questions
  objectiveMax: number;
  subjectiveMax: number; // total long-answer points still to be evaluated
  hasLongAnswers: boolean;
  graded: GradedAnswer[];
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
};

const isObjective = (t: QuestionType) => t !== "LONG_ANSWER";

// Case/space-insensitive match for single-word / true-false answers.
function textMatches(a: string | null | undefined, b: string | null | undefined): boolean {
  return (a ?? "").trim().toLowerCase() === (b ?? "").trim().toLowerCase();
}

export function gradeAttempt(
  questions: GradableQuestion[],
  answers: StudentAnswer[],
  negativeMarking: number
): GradeResult {
  const answerByQ = new Map(answers.map((a) => [a.questionId, a]));
  const nm = Math.min(Math.max(negativeMarking, 0), 1);

  let objectiveScore = 0;
  let objectiveMax = 0;
  let subjectiveMax = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;
  const graded: GradedAnswer[] = [];

  for (const q of questions) {
    const a = answerByQ.get(q.id);

    // ── Long answer: never auto-scored ──
    if (q.type === "LONG_ANSWER") {
      subjectiveMax += q.points;
      graded.push({
        questionId: q.id,
        selectedOptionId: null,
        studentAnswer: a?.studentAnswer ?? null,
        isCorrect: null,
        marksAwarded: null,
        autoScored: false,
      });
      continue;
    }

    objectiveMax += q.points;

    // Determine whether the student answered.
    const answered =
      q.type === "MCQ" ? !!a?.selectedOptionId : !!(a?.studentAnswer && a.studentAnswer.trim());
    if (!answered) {
      unansweredCount++;
      graded.push({
        questionId: q.id,
        selectedOptionId: null,
        studentAnswer: a?.studentAnswer ?? null,
        isCorrect: null,
        marksAwarded: 0,
        autoScored: true,
      });
      continue;
    }

    let isCorrect: boolean;
    if (q.type === "MCQ") {
      isCorrect = a!.selectedOptionId === q.correctOptionId;
    } else {
      isCorrect = textMatches(a!.studentAnswer, q.correctAnswer);
    }

    let marks: number;
    if (isCorrect) {
      marks = q.points;
      correctCount++;
    } else {
      marks = -(nm * q.points);
      wrongCount++;
    }
    objectiveScore += marks;
    graded.push({
      questionId: q.id,
      selectedOptionId: q.type === "MCQ" ? (a!.selectedOptionId ?? null) : null,
      studentAnswer: q.type === "MCQ" ? null : (a!.studentAnswer ?? null),
      isCorrect,
      marksAwarded: marks,
      autoScored: true,
    });
  }

  objectiveScore = Math.round(objectiveScore * 100) / 100;
  const hasLongAnswers = questions.some((q) => !isObjective(q.type));

  return {
    objectiveScore,
    objectiveMax,
    subjectiveMax,
    hasLongAnswers,
    graded,
    correctCount,
    wrongCount,
    unansweredCount,
  };
}
