// Objective auto-grading with negative marking (Module C).
// Correct answer: +points. Wrong answer: −(negativeMarking × points).
// Unanswered: 0. negativeMarking is a fraction in [0, 1].

export type GradableQuestion = {
  id: string;
  points: number;
  correctOptionId: string | null;
};

export type StudentAnswer = {
  questionId: string;
  selectedOptionId: string | null;
};

export type GradedAnswer = {
  questionId: string;
  selectedOptionId: string | null;
  isCorrect: boolean | null; // null = unanswered
};

export type GradeResult = {
  score: number;
  maxScore: number;
  graded: GradedAnswer[];
  correctCount: number;
  wrongCount: number;
  unansweredCount: number;
};

export function gradeObjective(
  questions: GradableQuestion[],
  answers: StudentAnswer[],
  negativeMarking: number
): GradeResult {
  const answerByQ = new Map(answers.map((a) => [a.questionId, a.selectedOptionId]));
  const nm = Math.min(Math.max(negativeMarking, 0), 1);

  let score = 0;
  let maxScore = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;
  const graded: GradedAnswer[] = [];

  for (const q of questions) {
    maxScore += q.points;
    const selected = answerByQ.get(q.id) ?? null;

    if (!selected) {
      unansweredCount++;
      graded.push({ questionId: q.id, selectedOptionId: null, isCorrect: null });
      continue;
    }

    const isCorrect = selected === q.correctOptionId;
    if (isCorrect) {
      score += q.points;
      correctCount++;
    } else {
      score -= nm * q.points;
      wrongCount++;
    }
    graded.push({ questionId: q.id, selectedOptionId: selected, isCorrect });
  }

  // Round to 2 decimals to avoid float noise from fractional negative marking.
  score = Math.round(score * 100) / 100;

  return { score, maxScore, graded, correctCount, wrongCount, unansweredCount };
}
