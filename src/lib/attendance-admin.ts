import "server-only";
import { db } from "@/lib/db";
import { todayDateOnly } from "@/lib/date";

// FR-AD-49: everything awaiting approval, newest date first. The page groups
// rows into teacher attendance vs student attendance (by user.role) and, for
// students, by batch-day so a full batch-day can be approved in one action.
export async function getPendingAttendance() {
  return db.attendance.findMany({
    where: { approvalStatus: "PENDING" },
    orderBy: [{ date: "desc" }, { markedAt: "asc" }],
    include: {
      user: { select: { name: true, role: true } },
      batch: { select: { id: true, name: true } },
    },
  });
}

// Teacher list + today's attendance row (for the admin marking panel, FR-AD-01).
export async function getTeachersForMarking() {
  const date = todayDateOnly();
  const teachers = await db.user.findMany({
    where: { role: "TEACHER", deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
  const rows = await db.attendance.findMany({
    where: { date, batchId: null, userId: { in: teachers.map((t) => t.id) } },
    select: { userId: true, status: true, approvalStatus: true },
  });
  const byUser = new Map(rows.map((r) => [r.userId, r]));
  return teachers.map((t) => ({
    ...t,
    today: byUser.get(t.id) ?? null,
  }));
}

// FR-AD-03: monthly present/absent summary per teacher (approved rows only).
export async function getTeacherMonthlySummary(year: number, month: number) {
  const from = new Date(Date.UTC(year, month, 1));
  const to = new Date(Date.UTC(year, month + 1, 1));
  const rows = await db.attendance.groupBy({
    by: ["userId", "status"],
    where: {
      batchId: null,
      user: { role: "TEACHER" },
      approvalStatus: { in: ["APPROVED", "AMENDED"] },
      date: { gte: from, lt: to },
    },
    _count: { _all: true },
  });
  const teachers = await db.user.findMany({
    where: { role: "TEACHER", deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  return teachers.map((t) => {
    const mine = rows.filter((r) => r.userId === t.id);
    const count = (s: string) => mine.find((r) => r.status === s)?._count._all ?? 0;
    return {
      id: t.id,
      name: t.name,
      present: count("PRESENT") + count("LATE"),
      absent: count("ABSENT"),
      onLeave: count("ON_LEAVE"),
    };
  });
}
