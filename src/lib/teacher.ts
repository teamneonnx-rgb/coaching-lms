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
    select: { userId: true, status: true, approvalStatus: true },
  });
  const byUser = new Map(attendance.map((a) => [a.userId, a]));

  return enrollments.map((e) => {
    const row = byUser.get(e.student.id);
    return {
      studentId: e.student.id,
      name: e.student.name,
      email: e.student.email,
      status: (row?.status ?? null) as AttendanceStatus | null,
      // FR-TE-12: teacher sees the approval state of submitted attendance.
      approvalStatus: row?.approvalStatus ?? null,
    };
  });
}

// Student/parent-facing history: approved records only (FR-AD-45/47 — pending
// attendance is invisible outside the teacher/admin flows).
export async function getRecentAttendance(userId: string, take = 10) {
  return db.attendance.findMany({
    where: { userId, approvalStatus: { in: ["APPROVED", "AMENDED"] } },
    orderBy: { date: "desc" },
    take,
    include: { batch: { select: { name: true } } },
  });
}
