import "server-only";
import type { Payment, PaymentStatus } from "@prisma/client";
import { db } from "@/lib/db";

// FR-AD-19: a payment is OVERDUE once its due date passes without full
// payment. Status is recomputed on every write AND defensively on read; the
// dashboard also sweeps stale rows so lists stay truthful without a cron.
export function computeStatus(p: {
  amountDue: number;
  amountPaid: number;
  dueDate: Date | null;
}): PaymentStatus {
  if (p.amountPaid >= p.amountDue) return "PAID";
  const overdue = p.dueDate ? p.dueDate < new Date() : false;
  if (overdue) return "OVERDUE";
  return p.amountPaid > 0 ? "PARTIAL" : "PENDING";
}

// Defensive sweep (FR-AD-19 "also compute on read"): persist OVERDUE on any
// unpaid row whose due date has passed. Cheap enough to run on page load.
export async function syncOverdueStatuses(): Promise<void> {
  await db.$executeRaw`
    UPDATE "Payment"
    SET status = 'OVERDUE'
    WHERE status IN ('PENDING', 'PARTIAL')
      AND "dueDate" IS NOT NULL AND "dueDate" < now()
      AND "amountPaid" < "amountDue"`;
}

export type PaymentWithStudent = Payment & {
  student: { id: string; name: string; email: string };
};

export async function getAllPayments(): Promise<PaymentWithStudent[]> {
  return db.payment.findMany({
    orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    include: { student: { select: { id: true, name: true, email: true } } },
  });
}

export async function getStudentPayments(studentId: string) {
  return db.payment.findMany({
    where: { studentId },
    orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
  });
}

// FR-AD-21: collected this month, pending total, overdue count, batch-wise
// collection breakdown.
export async function getPaymentsDashboard() {
  await syncOverdueStatuses();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [payments, batches] = await Promise.all([
    db.payment.findMany({
      include: { student: { select: { id: true } } },
    }),
    db.batch.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        enrollments: { where: { isActive: true }, select: { studentId: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  const collectedThisMonth = payments
    .filter((p) => p.paidOn && p.paidOn >= monthStart)
    .reduce((a, p) => a + p.amountPaid, 0);
  const pendingTotal = payments.reduce(
    (a, p) => a + Math.max(p.amountDue - p.amountPaid, 0),
    0
  );
  const overdueCount = payments.filter((p) => computeStatus(p) === "OVERDUE").length;

  // Batch-wise: attribute each student's payments to the batches they're in.
  const byStudent = new Map<string, { due: number; paid: number }>();
  for (const p of payments) {
    const cur = byStudent.get(p.studentId) ?? { due: 0, paid: 0 };
    cur.due += p.amountDue;
    cur.paid += p.amountPaid;
    byStudent.set(p.studentId, cur);
  }
  const perBatch = batches.map((b) => {
    let due = 0, paid = 0;
    for (const e of b.enrollments) {
      const s = byStudent.get(e.studentId);
      if (s) { due += s.due; paid += s.paid; }
    }
    return { id: b.id, name: b.name, due, paid, pending: Math.max(due - paid, 0) };
  });

  return { collectedThisMonth, pendingTotal, overdueCount, perBatch };
}

// Parents linked to a student (for fee reminders, FR-AD-20 / FR-PA-04).
export async function getParentUserIds(studentId: string): Promise<string[]> {
  const links = await db.parentLink.findMany({
    where: { studentId },
    select: { parentId: true },
  });
  return links.map((l) => l.parentId);
}
