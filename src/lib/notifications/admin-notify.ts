import "server-only";
import type { NotificationType } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Bulk-inserts one Notification per admin (SRD sequence step 3b / FR-ATT-03).
 * Synchronous DB write — fast, no queue needed. Returns the number created.
 */
export async function notifyAllAdmins({
  title,
  message,
  type,
}: {
  title: string;
  message: string;
  type: NotificationType;
}): Promise<number> {
  const admins = await db.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true },
  });
  if (admins.length === 0) return 0;

  const result = await db.notification.createMany({
    data: admins.map((a) => ({ userId: a.id, title, message, type })),
  });
  return result.count;
}
