import "server-only";
import { db } from "@/lib/db";

// ── Teacher ────────────────────────────────────────────────────────
export async function getTeacherAssignments(teacherId: string) {
  return db.assignment.findMany({
    where: { teacherId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: {
      course: { select: { title: true, batch: { select: { name: true } } } },
      _count: { select: { submissions: true } },
    },
  });
}

export async function getAssignmentForGrading(id: string, teacherId: string) {
  return db.assignment.findFirst({
    where: { id, teacherId, deletedAt: null },
    include: {
      course: { select: { title: true } },
      submissions: {
        orderBy: { submittedAt: "desc" },
        include: { student: { select: { name: true, email: true } } },
      },
    },
  });
}

// Teacher's courses for the "new assignment" dropdown.
export async function getTeacherCourseOptions(teacherId: string) {
  const courses = await db.course.findMany({
    where: { teacherId, deletedAt: null },
    orderBy: { title: "asc" },
    select: { id: true, title: true, batch: { select: { name: true } } },
  });
  return courses.map((c) => ({ id: c.id, label: `${c.title} · ${c.batch.name}` }));
}

// ── Student (batch-isolated) ───────────────────────────────────────
export async function getStudentAssignments(studentId: string, batchId: string) {
  return db.assignment.findMany({
    where: { course: { batches: { some: { batchId } } }, deletedAt: null },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    include: {
      course: { select: { title: true } },
      submissions: {
        where: { studentId },
        select: { id: true, status: true, score: true },
      },
    },
  });
}

export async function getAssignmentForStudent(id: string, batchId: string) {
  return db.assignment.findFirst({
    where: { id, course: { batches: { some: { batchId } } }, deletedAt: null },
    include: { course: { select: { title: true } } },
  });
}

export async function getStudentAssignmentSubmission(assignmentId: string, studentId: string) {
  return db.assignmentSubmission.findUnique({
    where: { assignmentId_studentId: { assignmentId, studentId } },
  });
}
