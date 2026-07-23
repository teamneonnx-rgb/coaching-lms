import "server-only";
import type { AttendanceStatus } from "@prisma/client";
import { db } from "@/lib/db";

// Batches a teacher is responsible for: batches they OWN (Batch.teacherId,
// PRD §4.2) plus batches any of their courses is delivered to. FR-TE-06 —
// no other batch is visible or reachable.
const teacherBatchWhere = (teacherId: string) => ({
  deletedAt: null,
  OR: [
    { teacherId },
    { courseLinks: { some: { course: { teacherId, deletedAt: null } } } },
  ],
});

export async function getTeacherBatches(teacherId: string) {
  return db.batch.findMany({
    where: teacherBatchWhere(teacherId),
    orderBy: { name: "asc" },
    select: { id: true, name: true, isActive: true },
  });
}

export async function teacherOwnsBatch(teacherId: string, batchId: string): Promise<boolean> {
  const batch = await db.batch.findFirst({
    where: { id: batchId, ...teacherBatchWhere(teacherId) },
    select: { id: true },
  });
  return Boolean(batch);
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
