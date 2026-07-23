"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/capabilities";
import { computeStatus, getParentUserIds } from "@/lib/payments";
import { notifyUser } from "@/lib/notifications/events";
import { logAudit } from "@/lib/audit";
import { formatDate } from "@/lib/date";

export type ActionResult = { ok: boolean; error?: string; info?: string };

const demandSchema = z.object({
  studentId: z.string().min(1, "Select a student"),
  title: z.string().trim().min(2, "Give the fee a name").max(120),
  amountDue: z.coerce.number().positive("Amount must be positive").max(10_000_000),
  dueDate: z.string().optional().or(z.literal("")),
});

// FR-AD-17: create a fee demand against a student.
export async function createFeeDemand(values: unknown): Promise<ActionResult> {
  const admin = await requireCapability("PAYMENT_COLLECT");
  const parsed = demandSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const data = parsed.data;

  const student = await db.user.findFirst({
    where: { id: data.studentId, role: "STUDENT", deletedAt: null },
    select: { id: true, name: true },
  });
  if (!student) return { ok: false, error: "Student not found" };

  const dueDate = data.dueDate ? new Date(data.dueDate) : null;
  const payment = await db.payment.create({
    data: {
      studentId: data.studentId,
      title: data.title,
      amountDue: data.amountDue,
      dueDate,
      status: computeStatus({ amountDue: data.amountDue, amountPaid: 0, dueDate }),
      recordedById: admin.id,
    },
    select: { id: true },
  });

  // FR-NT-02 fee due: tell the student + linked parents a fee is due.
  const parentIds = await getParentUserIds(data.studentId);
  const msg = {
    title: "Fee due",
    message: `${data.title}: ₹${data.amountDue}${dueDate ? ` due by ${formatDate(dueDate)}` : ""} for ${student.name}.`,
  };
  await Promise.all([notifyUser(data.studentId, msg), ...parentIds.map((id) => notifyUser(id, msg))]);

  await logAudit({
    actorId: admin.id, actorRole: admin.role, action: "payment.demand_create",
    entity: "Payment", entityId: payment.id, detail: `${data.title} ₹${data.amountDue} → ${student.name}`,
  });

  revalidatePath("/admin/payments");
  return { ok: true, info: "Fee demand created" };
}

const recordSchema = z.object({
  paymentId: z.string().min(1),
  amount: z.coerce.number().positive("Amount must be positive"),
  mode: z.enum(["CASH", "ONLINE", "CHEQUE", "UPI"]),
});

// FR-AD-18: record an offline payment (cash/online/cheque/UPI) + receipt.
export async function recordPayment(values: unknown): Promise<ActionResult & { receiptNo?: string }> {
  const admin = await requireCapability("PAYMENT_COLLECT");
  const parsed = recordSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const { paymentId, amount, mode } = parsed.data;

  const payment = await db.payment.findUnique({
    where: { id: paymentId },
    include: { student: { select: { id: true, name: true } } },
  });
  if (!payment) return { ok: false, error: "Fee record not found" };

  const remaining = payment.amountDue - payment.amountPaid;
  if (remaining <= 0) return { ok: false, error: "This fee is already fully paid" };
  if (amount > remaining + 0.01) return { ok: false, error: `Only ₹${remaining} is outstanding` };

  const amountPaid = payment.amountPaid + amount;
  const receiptNo = payment.receiptNo ?? `RCP-${Date.now().toString(36).toUpperCase()}`;
  const before = { amountPaid: payment.amountPaid, status: payment.status };

  await db.payment.update({
    where: { id: paymentId },
    data: {
      amountPaid,
      paidOn: new Date(),
      mode,
      receiptNo,
      status: computeStatus({ amountDue: payment.amountDue, amountPaid, dueDate: payment.dueDate }),
      recordedById: admin.id,
    },
  });

  await logAudit({
    actorId: admin.id, actorRole: admin.role, action: "payment.record",
    entity: "Payment", entityId: paymentId,
    detail: `₹${amount} ${mode} · receipt ${receiptNo} · ${payment.student.name}`,
    beforeValue: JSON.stringify(before),
    afterValue: JSON.stringify({ amountPaid, mode }),
  });

  revalidatePath("/admin/payments");
  revalidatePath("/student/fees");
  return { ok: true, receiptNo, info: `Recorded ₹${amount} — receipt ${receiptNo}` };
}

const remindSchema = z.object({
  scope: z.enum(["overdue", "all_pending"]),
});

// FR-AD-20 / FR-PA-04: fee reminders to parents (and the student), bulk by
// overdue or all-outstanding.
export async function sendFeeReminders(values: unknown): Promise<ActionResult> {
  const admin = await requireCapability("PAYMENT_NOTIFY");
  const parsed = remindSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const payments = await db.payment.findMany({
    where:
      parsed.data.scope === "overdue"
        ? { status: "OVERDUE" }
        : { status: { in: ["PENDING", "PARTIAL", "OVERDUE"] } },
    include: { student: { select: { id: true, name: true } } },
  });
  if (payments.length === 0) return { ok: false, error: "Nothing outstanding to remind about" };

  let sent = 0;
  for (const p of payments) {
    const outstanding = Math.max(p.amountDue - p.amountPaid, 0);
    if (outstanding <= 0) continue;
    const overdue = p.status === "OVERDUE";
    const msg = {
      title: overdue ? "Fee overdue" : "Fee reminder",
      message: `${p.title}: ₹${outstanding} ${overdue ? "is OVERDUE" : "is pending"}${p.dueDate ? ` (due ${formatDate(p.dueDate)})` : ""} for ${p.student.name}.`,
    };
    const parentIds = await getParentUserIds(p.studentId);
    await Promise.all([notifyUser(p.studentId, msg), ...parentIds.map((id) => notifyUser(id, msg))]);
    sent++;
  }

  await logAudit({
    actorId: admin.id, actorRole: admin.role, action: "payment.remind",
    entity: "Payment", detail: `${parsed.data.scope} · ${sent} fee(s)`,
  });

  revalidatePath("/admin/payments");
  return { ok: true, info: `Reminders sent for ${sent} fee(s)` };
}
