import "server-only";
import type { AttendanceStatus } from "@prisma/client";
import { db } from "@/lib/db";

// Batches a teacher is responsible for (those containing at least one of their
// courses). Teachers can only mark attendance for these (authorization).
export async function getTeacherBatches(teacherId: string) {
  const courses = await db.course.findMany({
    where: { teacherId },
    select: { batch: { select: { id: true, name: true, isActive: true } } },
    orderBy: { batch: { name: "asc" } },
  });
  // A teacher may have several courses in one batch — dedupe to unique batches.
  const seen = new Map<string, { id: string; name: string; isActive: boolean }>();
  for (const c of courses) seen.set(c.batch.id, c.batch);
  return [...seen.values()];
}

export async function teacherOwnsBatch(teacherId: string, batchId: string): Promise<boolean> {
  const course = await db.course.findFirst({
    where: { teacherId, batchId },
    select: { id: true },
  });
  return Boolean(course);
}

// Roster for a batch on a date: enrolled students + their attendance status.
export async function getBatchRoster(batchId: string, date: Date) {
  const enrollments = await db.enrollment.findMany({
    where: { batchId, isActive: true },
    include: { student: { select: { id: true, name: true, email: true } } },
    orderBy: { student: { name: "asc" } },
  });

  const attendance = await db.attendance.findMany({
    where: { batchId, date },
    select: { userId: true, status: true },
  });
  const statusByUser = new Map<string, AttendanceStatus>(
    attendance.map((a) => [a.userId, a.status])
  );

  return enrollments.map((e) => ({
    studentId: e.student.id,
    name: e.student.name,
    email: e.student.email,
    status: statusByUser.get(e.student.id) ?? null,
  }));
}

export async function getRecentAttendance(userId: string, take = 10) {
  return db.attendance.findMany({
    where: { userId },
    orderBy: { date: "desc" },
    take,
    include: { batch: { select: { name: true } } },
  });
}

// Student self-marked attendances awaiting this teacher's validation (FR-ATT-4).
export async function getPendingValidations(teacherId: string) {
  const batches = await getTeacherBatches(teacherId);
  const batchIds = batches.map((b) => b.id);
  if (batchIds.length === 0) return [];

  return db.attendance.findMany({
    where: {
      batchId: { in: batchIds },
      validatedById: null,
      user: { role: "STUDENT" },
    },
    orderBy: { markedAt: "desc" },
    take: 50,
    include: {
      user: { select: { name: true, email: true } },
      batch: { select: { name: true } },
    },
  });
}
