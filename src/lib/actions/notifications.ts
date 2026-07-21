"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";

export type ActionResult = { ok: boolean; error?: string };

const idSchema = z.object({ id: z.string().min(1) });

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const user = await requireUser();
  await db.notification.updateMany({
    where: { userId: user.id, isRead: false },
    data: { isRead: true },
  });
  return { ok: true };
}

export async function markNotificationRead(values: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = idSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  // Scope to the caller's own notifications.
  await db.notification.updateMany({
    where: { id: parsed.data.id, userId: user.id },
    data: { isRead: true },
  });
  return { ok: true };
}
