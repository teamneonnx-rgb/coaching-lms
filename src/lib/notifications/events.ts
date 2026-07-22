import "server-only";
import { db } from "@/lib/db";
import { sendEmail } from "@/lib/notifications/email";

// Stage-based notification helpers (FR-NOT). In-app Notification rows are the
// source of truth (shown in bells); email is best-effort and degrades to a log
// when Resend isn't configured.

// Active students enrolled in the batch that owns this course.
async function studentsForCourse(courseId: string) {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { batchId: true },
  });
  if (!course) return [];
  const enrollments = await db.enrollment.findMany({
    where: { batchId: course.batchId, isActive: true },
    select: { student: { select: { id: true, name: true, email: true } } },
  });
  return enrollments.map((e) => e.student);
}

// Notify all admin-area users (SUPER_ADMIN / ADMIN) — e.g. content awaiting
// approval. IT is excluded as it can't approve content (FR-APR / FR-RBAC).
export async function notifyAdmins(msg: { title: string; message: string }) {
  const admins = await db.user.findMany({
    where: { role: { in: ["SUPER_ADMIN", "ADMIN"] }, deletedAt: null },
    select: { id: true, name: true, email: true },
  });
  if (admins.length === 0) return;

  await db.notification.createMany({
    data: admins.map((a) => ({
      userId: a.id,
      title: msg.title,
      message: msg.message,
      type: "SYSTEM_ALERT" as const,
    })),
  });

  void Promise.allSettled(
    admins
      .filter((a) => a.email)
      .map((a) => sendEmail({ to: a.email, subject: msg.title, html: emailHtml(a.name, msg.title, msg.message) }))
  ).catch(() => {});
}

// Notify every student in a course's batch (in-app + email).
export async function notifyBatchStudents(
  courseId: string,
  msg: { title: string; message: string }
) {
  const students = await studentsForCourse(courseId);
  if (students.length === 0) return;

  await db.notification.createMany({
    data: students.map((s) => ({
      userId: s.id,
      title: msg.title,
      message: msg.message,
      type: "SYSTEM_ALERT" as const,
    })),
  });

  // Best-effort emails (non-blocking).
  void Promise.allSettled(
    students
      .filter((s) => s.email)
      .map((s) =>
        sendEmail({
          to: s.email,
          subject: msg.title,
          html: emailHtml(s.name, msg.title, msg.message),
        })
      )
  ).catch(() => {});
}

// Notify a single user (in-app + email).
export async function notifyUser(
  userId: string,
  msg: { title: string; message: string }
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true },
  });
  if (!user) return;

  await db.notification.create({
    data: { userId, title: msg.title, message: msg.message, type: "SYSTEM_ALERT" },
  });

  if (user.email) {
    void sendEmail({
      to: user.email,
      subject: msg.title,
      html: emailHtml(user.name, msg.title, msg.message),
    }).catch(() => {});
  }
}

// Welcome email on account creation / enrollment (FR-NOT welcome row).
export async function sendWelcomeEmail(to: string, name: string) {
  void sendEmail({
    to,
    subject: "Welcome to Coaching Institute LMS",
    html: emailHtml(
      name,
      "Welcome aboard 🎓",
      "Your account is ready. Sign in to access your batch content, tests, and attendance."
    ),
  }).catch(() => {});
}

function emailHtml(name: string, heading: string, body: string) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;color:#0f172a">
      <h2 style="margin:0 0 8px">${heading}</h2>
      <p>Hi ${name},</p>
      <p>${body}</p>
      <p style="color:#64748b;font-size:13px">— Coaching Institute LMS</p>
    </div>`;
}
