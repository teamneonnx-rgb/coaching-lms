import "server-only";
import { db } from "@/lib/db";
import { getAccessPolicy } from "@/lib/access-policy";

// ── Q&A / Doubts ───────────────────────────────────────────────────
// Teacher: doubts raised on any course this teacher owns.
export async function getTeacherDoubts(teacherId: string) {
  return db.doubt.findMany({
    where: { course: { teacherId }, deletedAt: null },
    orderBy: [{ isResolved: "asc" }, { createdAt: "desc" }],
    include: {
      course: { select: { title: true } },
      author: { select: { name: true } },
      _count: { select: { replies: { where: { deletedAt: null } } } },
    },
  });
}

export async function getDoubtForTeacher(id: string, teacherId: string) {
  return db.doubt.findFirst({
    where: { id, course: { teacherId }, deletedAt: null },
    include: {
      course: { select: { title: true } },
      author: { select: { name: true, role: true } },
      replies: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, role: true } } },
      },
    },
  });
}

// Student: doubts across the courses of their active batch. When the institute
// disables public doubts (FR-ACL), a student sees only their own threads.
export async function getStudentDoubts(batchId: string, studentId: string) {
  const policy = await getAccessPolicy();
  return db.doubt.findMany({
    where: {
      course: { batches: { some: { batchId } } },
      deletedAt: null,
      ...(policy.publicDoubts ? {} : { authorId: studentId }),
    },
    orderBy: [{ isResolved: "asc" }, { createdAt: "desc" }],
    include: {
      course: { select: { title: true } },
      author: { select: { name: true } },
      _count: { select: { replies: { where: { deletedAt: null } } } },
    },
  });
}

export async function getDoubtForStudent(id: string, batchId: string, studentId: string) {
  const policy = await getAccessPolicy();
  return db.doubt.findFirst({
    where: {
      id,
      course: { batches: { some: { batchId } } },
      deletedAt: null,
      ...(policy.publicDoubts ? {} : { authorId: studentId }),
    },
    include: {
      course: { select: { title: true } },
      author: { select: { name: true, role: true } },
      replies: {
        where: { deletedAt: null },
        orderBy: { createdAt: "asc" },
        include: { author: { select: { name: true, role: true } } },
      },
    },
  });
}

// Courses in a batch — for the student "ask a doubt" course picker.
export async function getBatchCourseOptions(batchId: string) {
  return db.course.findMany({
    where: { batches: { some: { batchId } }, deletedAt: null },
    orderBy: { title: "asc" },
    select: { id: true, title: true },
  });
}

// ── Comments (on a content Resource) ───────────────────────────────
export async function getResourceComments(resourceId: string) {
  return db.comment.findMany({
    where: { resourceId, deletedAt: null },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { name: true, role: true } } },
  });
}

// ── Feedback ───────────────────────────────────────────────────────
// The signed-in student's own rating for a course (for the edit form).
export async function getStudentFeedback(courseId: string, studentId: string) {
  return db.feedback.findUnique({
    where: { courseId_studentId: { courseId, studentId } },
    select: { rating: true, comment: true },
  });
}

// FR-AD-22/23: admin feedback inbox — all student + parent feedback, filterable
// by teacher, batch, submitter role and period. Course feedback resolves its
// teacher through the course; parent feedback carries targetTeacherId + wardId.
export async function getFeedbackInbox(filter: {
  teacherId?: string;
  batchId?: string;
  role?: string;
  period?: string;
} = {}) {
  const rows = await db.feedback.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: {
      student: { select: { name: true, role: true } },
      course: {
        select: {
          title: true,
          teacher: { select: { id: true, name: true } },
          batches: { select: { batch: { select: { id: true, name: true } } } },
        },
      },
    },
  });

  const items = rows.map((f) => {
    const teacherId = f.course?.teacher.id ?? f.targetTeacherId ?? null;
    const teacherName = f.course?.teacher.name ?? null;
    const batches = f.course?.batches.map((b) => b.batch) ?? [];
    return {
      id: f.id,
      rating: f.rating,
      comment: f.comment,
      byRole: f.givenByRole,
      byName: f.student.name ?? "User",
      period: f.period,
      createdAt: f.createdAt,
      target: f.course?.title ?? "Teacher",
      teacherId,
      teacherName,
      batchIds: batches.map((b) => b.id),
      batchNames: batches.map((b) => b.name),
    };
  });

  return items.filter((i) => {
    if (filter.teacherId && i.teacherId !== filter.teacherId) return false;
    if (filter.batchId && !i.batchIds.includes(filter.batchId)) return false;
    if (filter.role && i.byRole !== filter.role) return false;
    if (filter.period && i.period !== filter.period) return false;
    return true;
  });
}

// Aggregate rating for a course — shown to the teacher.
export async function getCourseFeedbackSummary(courseId: string) {
  const [agg, rows] = await Promise.all([
    db.feedback.aggregate({
      where: { courseId },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    db.feedback.findMany({
      where: { courseId },
      orderBy: { createdAt: "desc" },
      include: { student: { select: { name: true } } },
    }),
  ]);
  return {
    average: agg._avg.rating ?? 0,
    count: agg._count._all,
    reviews: rows,
  };
}
