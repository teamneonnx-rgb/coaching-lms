import "server-only";
import { db } from "@/lib/db";

// Attendance that counts as "attended" for percentage purposes.
const ATTENDED = ["PRESENT", "LATE"] as const;

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

// Average of score/maxScore across graded rows, as a 0–100 percentage.
function avgScorePct(rows: { score: number | null; max: number | null }[]): number | null {
  const valid = rows.filter((r) => r.score !== null && r.max !== null && r.max > 0);
  if (valid.length === 0) return null;
  const sum = valid.reduce((a, r) => a + (r.score as number) / (r.max as number), 0);
  return Math.round((sum / valid.length) * 100);
}

// ── Institute report (admin) ───────────────────────────────────────
export async function getInstituteReport() {
  const [students, teachers, batches, courses, attendanceRows, assessmentSubs, assignmentSubs, feedbackAgg, doubtsTotal, doubtsOpen] =
    await Promise.all([
      db.user.count({ where: { role: "STUDENT", deletedAt: null } }),
      db.user.count({ where: { role: "TEACHER", deletedAt: null } }),
      db.batch.count({ where: { deletedAt: null } }),
      db.course.count({ where: { deletedAt: null } }),
      db.attendance.groupBy({ by: ["status"], _count: { _all: true } }),
      db.submission.findMany({ where: { status: "GRADED" }, select: { score: true, maxScore: true } }),
      db.assignmentSubmission.findMany({ where: { status: "GRADED" }, select: { score: true, assignment: { select: { totalMarks: true } } } }),
      db.feedback.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
      db.doubt.count({ where: { deletedAt: null } }),
      db.doubt.count({ where: { deletedAt: null, isResolved: false } }),
    ]);

  const attTotal = attendanceRows.reduce((a, r) => a + r._count._all, 0);
  const attAttended = attendanceRows
    .filter((r) => (ATTENDED as readonly string[]).includes(r.status))
    .reduce((a, r) => a + r._count._all, 0);

  const assessmentAvg = avgScorePct(assessmentSubs.map((s) => ({ score: s.score, max: s.maxScore })));
  const assignmentAvg = avgScorePct(assignmentSubs.map((s) => ({ score: s.score, max: s.assignment.totalMarks })));

  const perBatch = await getBatchBreakdown();

  return {
    kpis: {
      students, teachers, batches, courses,
      attendancePct: pct(attAttended, attTotal),
      assessmentAvg,
      assignmentAvg,
      feedbackAvg: feedbackAgg._avg.rating ? Number(feedbackAgg._avg.rating.toFixed(1)) : null,
      feedbackCount: feedbackAgg._count._all,
      doubtsTotal,
      doubtsOpen,
    },
    perBatch,
  };
}

// Per-batch rollup used by the institute report.
export async function getBatchBreakdown() {
  const batches = await db.batch.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      isActive: true,
      _count: { select: { enrollments: { where: { isActive: true } } } },
    },
  });

  return Promise.all(
    batches.map(async (b) => {
      const [attRows, subs] = await Promise.all([
        db.attendance.groupBy({ by: ["status"], where: { batchId: b.id }, _count: { _all: true } }),
        db.submission.findMany({
          where: { status: "GRADED", assessment: { course: { batchId: b.id } } },
          select: { score: true, maxScore: true },
        }),
      ]);
      const attTotal = attRows.reduce((a, r) => a + r._count._all, 0);
      const attAttended = attRows
        .filter((r) => (ATTENDED as readonly string[]).includes(r.status))
        .reduce((a, r) => a + r._count._all, 0);
      return {
        id: b.id,
        name: b.name,
        isActive: b.isActive,
        students: b._count.enrollments,
        attendancePct: pct(attAttended, attTotal),
        assessmentAvg: avgScorePct(subs.map((s) => ({ score: s.score, max: s.maxScore }))),
      };
    })
  );
}

// ── Teacher class report ───────────────────────────────────────────
// For each batch the teacher teaches, a roster with per-student metrics.
export async function getTeacherClassReport(teacherId: string) {
  const batches = await db.batch.findMany({
    where: { deletedAt: null, courses: { some: { teacherId, deletedAt: null } } },
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      enrollments: {
        where: { isActive: true },
        select: { student: { select: { id: true, name: true, email: true } } },
      },
    },
  });

  return Promise.all(
    batches.map(async (b) => {
      const studentIds = b.enrollments.map((e) => e.student.id);
      const [attRows, assessSubs, assignSubs] = await Promise.all([
        db.attendance.groupBy({
          by: ["userId", "status"],
          where: { batchId: b.id, userId: { in: studentIds } },
          _count: { _all: true },
        }),
        db.submission.findMany({
          where: { status: "GRADED", studentId: { in: studentIds }, assessment: { course: { batchId: b.id } } },
          select: { studentId: true, score: true, maxScore: true },
        }),
        db.assignmentSubmission.findMany({
          where: { status: "GRADED", studentId: { in: studentIds }, assignment: { course: { batchId: b.id } } },
          select: { studentId: true, score: true, assignment: { select: { totalMarks: true } } },
        }),
      ]);

      const rows = b.enrollments.map((e) => {
        const sid = e.student.id;
        const myAtt = attRows.filter((r) => r.userId === sid);
        const attTotal = myAtt.reduce((a, r) => a + r._count._all, 0);
        const attAttended = myAtt
          .filter((r) => (ATTENDED as readonly string[]).includes(r.status))
          .reduce((a, r) => a + r._count._all, 0);
        return {
          id: sid,
          name: e.student.name ?? "Student",
          email: e.student.email,
          attendancePct: pct(attAttended, attTotal),
          assessmentAvg: avgScorePct(assessSubs.filter((s) => s.studentId === sid).map((s) => ({ score: s.score, max: s.maxScore }))),
          assignmentAvg: avgScorePct(assignSubs.filter((s) => s.studentId === sid).map((s) => ({ score: s.score, max: s.assignment.totalMarks }))),
        };
      });

      return { id: b.id, name: b.name, students: rows };
    })
  );
}

// ── Student progress report (self) ─────────────────────────────────
export async function getStudentReport(studentId: string, batchId: string) {
  const [attRows, totalResources, completed, assessSubs, assignSubs] = await Promise.all([
    db.attendance.groupBy({ by: ["status"], where: { userId: studentId, batchId }, _count: { _all: true } }),
    db.resource.count({ where: { approvalStatus: "APPROVED", chapter: { course: { batchId, deletedAt: null } } } }),
    db.resourceProgress.count({ where: { studentId, resource: { approvalStatus: "APPROVED", chapter: { course: { batchId, deletedAt: null } } } } }),
    db.submission.findMany({
      where: { status: "GRADED", studentId, assessment: { course: { batchId } } },
      select: { score: true, maxScore: true, assessment: { select: { title: true } } },
    }),
    db.assignmentSubmission.findMany({
      where: { status: "GRADED", studentId, assignment: { course: { batchId } } },
      select: { score: true, assignment: { select: { title: true, totalMarks: true } } },
    }),
  ]);

  const attTotal = attRows.reduce((a, r) => a + r._count._all, 0);
  const attAttended = attRows
    .filter((r) => (ATTENDED as readonly string[]).includes(r.status))
    .reduce((a, r) => a + r._count._all, 0);

  return {
    attendancePct: pct(attAttended, attTotal),
    attendanceMarked: attTotal,
    completionPct: pct(completed, totalResources),
    completed,
    totalResources,
    assessmentAvg: avgScorePct(assessSubs.map((s) => ({ score: s.score, max: s.maxScore }))),
    assignmentAvg: avgScorePct(assignSubs.map((s) => ({ score: s.score, max: s.assignment.totalMarks }))),
    assessments: assessSubs.map((s) => ({
      title: s.assessment.title,
      score: s.score,
      max: s.maxScore,
    })),
    assignments: assignSubs.map((s) => ({
      title: s.assignment.title,
      score: s.score,
      max: s.assignment.totalMarks,
    })),
  };
}
