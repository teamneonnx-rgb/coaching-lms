import "server-only";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";

// Provision (if needed) and link a Parent account to a student (FR-PAR-1/2).
// Returns the parent's temp password only when a NEW account was created.
export async function linkParentForStudent(input: {
  studentId: string;
  studentName: string;
  parentName?: string | null;
  parentEmail?: string | null;
  instituteId?: string | null;
}): Promise<{ created: boolean; parentEmail?: string; tempPassword?: string } | null> {
  const email = input.parentEmail?.trim().toLowerCase();
  if (!email) return null;

  let parent = await db.user.findUnique({ where: { email } });
  let created = false;
  let tempPassword: string | undefined;

  if (!parent) {
    tempPassword = "Parent@" + Math.random().toString(36).slice(2, 8);
    parent = await db.user.create({
      data: {
        name: input.parentName?.trim() || `${input.studentName}'s parent`,
        email,
        password: await bcrypt.hash(tempPassword, 12),
        role: "PARENT",
        instituteId: input.instituteId ?? null,
      },
    });
    created = true;
  } else if (parent.role !== "PARENT") {
    // Email already belongs to a non-parent user — don't hijack it.
    return null;
  }

  await db.parentLink.upsert({
    where: { parentId_studentId: { parentId: parent.id, studentId: input.studentId } },
    update: {},
    create: { parentId: parent.id, studentId: input.studentId },
  });

  return { created, parentEmail: email, tempPassword };
}

// Students linked to a parent, with attendance % and recent marks (FR-PAR-3).
export async function getParentChildren(parentId: string) {
  const links = await db.parentLink.findMany({
    where: { parentId },
    include: {
      student: {
        select: {
          id: true,
          name: true,
          email: true,
          enrollments: {
            where: { isActive: true },
            select: { batch: { select: { id: true, name: true } } },
          },
        },
      },
    },
  });

  const children = [];
  for (const link of links) {
    const s = link.student;
    const [attendance, submissions] = await Promise.all([
      db.attendance.findMany({
        // FR-AD-45: parents see approved attendance only.
        where: { userId: s.id, approvalStatus: { in: ["APPROVED", "AMENDED"] } },
        orderBy: { date: "desc" },
        take: 60,
        select: { status: true, date: true },
      }),
      db.submission.findMany({
        where: { studentId: s.id, status: "GRADED" },
        orderBy: { submittedAt: "desc" },
        take: 10,
        select: {
          score: true,
          maxScore: true,
          assessment: { select: { title: true } },
        },
      }),
    ]);

    const present = attendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
    const pct = attendance.length > 0 ? Math.round((present / attendance.length) * 100) : null;

    children.push({
      id: s.id,
      name: s.name,
      email: s.email,
      batches: s.enrollments.map((e) => e.batch.name),
      attendancePct: pct,
      attendanceCount: attendance.length,
      recentMarks: submissions.map((sub) => ({
        title: sub.assessment.title,
        score: sub.score,
        maxScore: sub.maxScore,
      })),
    });
  }
  return children;
}
