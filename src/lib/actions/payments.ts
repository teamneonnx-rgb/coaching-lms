"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";
import { computeStatus, getParentUserIds } from "@/lib/payments";
import { createRazorpayOrder, verifyCheckoutSignature } from "@/lib/razorpay";
import { notifyUser } from "@/lib/notifications/events";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: boolean; error?: string; info?: string };

// Student starts an online payment for one of THEIR OWN outstanding fees.
// Server-side ownership check; amount always derived server-side.
export async function startOnlinePayment(paymentId: string): Promise<
  ActionResult & { orderId?: string; keyId?: string; amountPaise?: number; studentName?: string }
> {
  const student = await requireRole("STUDENT");

  const payment = await db.payment.findFirst({
    where: { id: paymentId, studentId: student.id },
  });
  if (!payment) return { ok: false, error: "Fee record not found" };

  const outstandingRupees = Math.max(payment.amountDue - payment.amountPaid, 0);
  if (outstandingRupees <= 0) return { ok: false, error: "This fee is already fully paid" };
  const amountPaise = Math.round(outstandingRupees * 100);

  const order = await createRazorpayOrder({
    amountPaise,
    receipt: payment.id.slice(0, 40),
    notes: { paymentId: payment.id, studentId: student.id },
  });
  if (!order.ok) return { ok: false, error: order.error };

  await db.payment.update({
    where: { id: payment.id },
    data: { razorpayOrderId: order.orderId },
  });

  return {
    ok: true,
    orderId: order.orderId,
    keyId: order.keyId,
    amountPaise,
    studentName: student.name ?? "Student",
  };
}

const verifySchema = z.object({
  paymentId: z.string().min(1),
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  signature: z.string().min(1),
});

// Checkout success callback → verify the HMAC signature with the key secret
// (official Razorpay flow), then mark the fee paid.
export async function verifyOnlinePayment(values: unknown): Promise<ActionResult> {
  const student = await requireRole("STUDENT");
  const parsed = verifySchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { paymentId, razorpayOrderId, razorpayPaymentId, signature } = parsed.data;

  const payment = await db.payment.findFirst({
    where: { id: paymentId, studentId: student.id, razorpayOrderId },
  });
  if (!payment) return { ok: false, error: "Fee record not found" };

  const valid = await verifyCheckoutSignature({
    orderId: razorpayOrderId,
    paymentId: razorpayPaymentId,
    signature,
  });
  if (!valid) return { ok: false, error: "Payment signature verification failed" };

  const amountPaid = payment.amountDue; // full outstanding was ordered
  const receiptNo = payment.receiptNo ?? `RCP-${Date.now().toString(36).toUpperCase()}`;

  await db.payment.update({
    where: { id: payment.id },
    data: {
      amountPaid,
      paidOn: new Date(),
      mode: "RAZORPAY",
      razorpayPaymentId,
      receiptNo,
      status: computeStatus({ amountDue: payment.amountDue, amountPaid, dueDate: payment.dueDate }),
    },
  });

  const parentIds = await getParentUserIds(student.id);
  const msg = {
    title: "Payment received",
    message: `${payment.title}: ₹${payment.amountDue} paid online — receipt ${receiptNo}.`,
  };
  await Promise.all([notifyUser(student.id, msg), ...parentIds.map((id) => notifyUser(id, msg))]);

  await logAudit({
    actorId: student.id, actorRole: "STUDENT", action: "payment.online",
    entity: "Payment", entityId: payment.id,
    detail: `₹${payment.amountDue} Razorpay ${razorpayPaymentId} · receipt ${receiptNo}`,
  });

  revalidatePath("/student/fees");
  revalidatePath("/admin/payments");
  return { ok: true, info: `Payment successful — receipt ${receiptNo}` };
}
