import "server-only";
import { db } from "@/lib/db";

// All student reads are scoped to the student's ACTIVE batch. Every query
// filters on batchId so a student can never reach another batch's content
// (FR-COURSE-02, NFR-SEC-01).

export async function getActiveBatch(studentId: string) {
  const enrollment = await db.enrollment.findFirst({
    where: { studentId, isActive: true },
    include: { batch: true },
    orderBy: { enrolledAt: "desc" },
  });
  return enrollment?.batch ?? null;
}

export async function getStudentCourses(studentId: string, batchId: string) {
  return db.course.findMany({
    where: { batchId }, // tenancy filter
    orderBy: { createdAt: "asc" },
    include: {
      teacher: { select: { name: true } },
      _count: { select: { chapters: true } },
      chapters: {
        select: { _count: { select: { resources: true } } },
      },
    },
  });
}

// Course detail — returns null unless the course is in the student's active batch.
export async function getCourseForStudent(
  studentId: string,
  courseId: string,
  batchId: string
) {
  return db.course.findFirst({
    where: { id: courseId, batchId }, // both id AND batchId required
    include: {
      teacher: { select: { name: true } },
      batch: { select: { id: true, name: true } },
      chapters: {
        orderBy: { order: "asc" },
        include: {
          resources: {
            orderBy: { order: "asc" },
            select: { id: true, title: true, type: true, duration: true, fileSize: true },
          },
        },
      },
    },
  });
}

// Resource detail — verifies the resource's chapter→course belongs to the
// student's active batch before returning it. Returns null on any mismatch.
export async function getResourceForStudent(resourceId: string, batchId: string) {
  return db.resource.findFirst({
    where: {
      id: resourceId,
      chapter: { course: { batchId } }, // tenancy filter through relations
    },
    include: {
      chapter: {
        select: {
          id: true,
          title: true,
          course: { select: { id: true, title: true } },
        },
      },
    },
  });
}

// Progress totals for the "Process vs Done" donut (scoped to active batch).
export async function getStudentProgress(studentId: string, batchId: string) {
  const [total, done] = await Promise.all([
    db.resource.count({ where: { chapter: { course: { batchId } } } }),
    db.resourceProgress.count({
      where: { studentId, resource: { chapter: { course: { batchId } } } },
    }),
  ]);
  return { total, done, remaining: Math.max(total - done, 0) };
}

export async function getCompletedResourceIds(studentId: string, batchId: string) {
  const rows = await db.resourceProgress.findMany({
    where: { studentId, resource: { chapter: { course: { batchId } } } },
    select: { resourceId: true },
  });
  return new Set(rows.map((r) => r.resourceId));
}
