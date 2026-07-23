"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/capabilities";
import { notifyUser } from "@/lib/notifications/events";
import { logAudit } from "@/lib/audit";
import { parseDateOnly, formatDate } from "@/lib/date";

export type ActionResult = { ok: boolean; error?: string; info?: string };

const schema = z.object({
  batchId: z.string().min(1, "Select a batch"),
  sessionDate: z.string().min(1, "Pick a date"),
  topicsCovered: z.string().trim().min(3, "What was covered?").max(3000),
  homework: z.string().trim().max(2000).optional().or(z.literal("")),
  remarks: z.string().trim().max(2000).optional().or(z.literal("")),
});

// FR-AD-41/42/43: publish a per-day class session summary — it lands on the
// profile of every parent whose ward is in the batch, and parents are notified.
export async function publishSessionSummary(values: unknown): Promise<ActionResult> {
  const admin = await requireCapability("SESSION_SUMMARY_UPLOAD");
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const batch = await db.batch.findFirst({
    where: { id: d.batchId, deletedAt: null },
    select: { id: true, name: true },
  });
  if (!batch) return { ok: false, error: "Batch not found" };

  const summary = await db.classSessionSummary.create({
    data: {
      batchId: d.batchId,
      sessionDate: parseDateOnly(d.sessionDate),
      topicsCovered: d.topicsCovered,
      homework: d.homework || null,
      remarks: d.remarks || null,
      uploadedById: admin.id,
    },
    select: { id: true, sessionDate: true },
  });

  // Notify every parent linked to a ward enrolled in this batch (FR-AD-43).
  const links = await db.parentLink.findMany({
    where: { student: { enrollments: { some: { batchId: d.batchId, isActive: true } } } },
    select: { parentId: true },
  });
  const parentIds = [...new Set(links.map((l) => l.parentId))];
  await Promise.all(
    parentIds.map((id) =>
      notifyUser(id, {
        title: "Class session summary",
        message: `${batch.name} · ${formatDate(summary.sessionDate)}: ${d.topicsCovered.slice(0, 120)}`,
      })
    )
  );

  await logAudit({
    actorId: admin.id, actorRole: admin.role, action: "session_summary.publish",
    entity: "ClassSessionSummary", entityId: summary.id, detail: `${batch.name} ${d.sessionDate}`,
  });

  revalidatePath("/admin/session-summaries");
  revalidatePath("/parent");
  return { ok: true, info: `Published — ${parentIds.length} parent(s) notified` };
}
