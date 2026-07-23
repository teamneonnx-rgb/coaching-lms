import "server-only";
import { db } from "@/lib/db";

// ── Teacher side ───────────────────────────────────────────────────

// Courses the teacher owns, each with its assessments (Tier 2/3 nav).
export async function getTeacherCoursesWithAssessments(teacherId: string) {
  return db.course.findMany({
    where: { teacherId },
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      batch: { select: { name: true } },
      assessments: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          type: true,
          isPublished: true,
          _count: { select: { questions: true, submissions: true } },
        },
      },
    },
  });
}

// Full assessment for the builder — teacher must own it.
export async function getAssessmentForEdit(assessmentId: string, teacherId: string) {
  return db.assessment.findFirst({
    where: { id: assessmentId, teacherId },
    include: {
      course: { select: { id: true, title: true } },
      _count: { select: { submissions: true } },
      questions: {
        orderBy: { order: "asc" },
        include: { options: { orderBy: { order: "asc" } } },
      },
    },
  });
}

// Submissions for grading/review — teacher must own the assessment.
export async function getAssessmentWithSubmissions(assessmentId: string, teacherId: string) {
  return db.assessment.findFirst({
    where: { id: assessmentId, teacherId },
    include: {
      course: { select: { title: true } },
      submissions: {
        orderBy: { submittedAt: "desc" },
        include: { student: { select: { name: true, email: true } } },
      },
    },
  });
}

// ── Student side (batch-isolated, no answer leakage) ───────────────

// Published assessments in the student's active batch + their submission status.
export async function getStudentAssessments(studentId: string, batchId: string) {
  return db.assessment.findMany({
    where: { isPublished: true, course: { batches: { some: { batchId } } } }, // tenancy filter
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      timeLimit: true,
      course: { select: { title: true } },
      _count: { select: { questions: true } },
      submissions: {
        where: { studentId },
        select: { id: true, status: true, score: true, maxScore: true },
      },
    },
  });
}

// Assessment for TAKING — published + in batch. Options are returned WITHOUT
// isCorrect so answers can't leak to the client.
export async function getAssessmentForStudent(
  assessmentId: string,
  batchId: string
) {
  return db.assessment.findFirst({
    where: { id: assessmentId, isPublished: true, course: { batches: { some: { batchId } } } },
    select: {
      id: true,
      title: true,
      description: true,
      type: true,
      timeLimit: true,
      course: { select: { title: true } },
      questions: {
        orderBy: { order: "asc" },
        select: {
          id: true,
          text: true,
          type: true, // drives the input widget
          points: true,
          options: {
            orderBy: { order: "asc" },
            select: { id: true, text: true }, // NO isCorrect / correctAnswer
          },
        },
      },
    },
  });
}

// FR-TE-14: attempts awaiting long-answer marking, oldest first, with the
// long-answer questions + the student's responses.
export async function getPendingEvaluations(teacherId: string) {
  return db.submission.findMany({
    where: {
      evaluationStatus: "PARTIAL_AWAITING_EVALUATION",
      assessment: { teacherId },
    },
    orderBy: { submittedAt: "asc" },
    select: {
      id: true,
      objectiveScore: true,
      maxScore: true,
      submittedAt: true,
      student: { select: { name: true, email: true } },
      assessment: { select: { title: true } },
      answers: {
        where: { autoScored: false },
        select: {
          id: true,
          studentAnswer: true,
          question: { select: { text: true, points: true } },
        },
      },
    },
  });
}

export async function getStudentSubmission(assessmentId: string, studentId: string) {
  return db.submission.findUnique({
    where: { assessmentId_studentId: { assessmentId, studentId } },
    include: {
      answers: { select: { questionId: true, selectedOptionId: true, isCorrect: true } },
    },
  });
}
