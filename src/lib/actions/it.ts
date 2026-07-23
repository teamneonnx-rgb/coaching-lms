"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/session";

export type ActionResult = { ok: boolean; error?: string; info?: string };

const schema = z.object({
  id: z.string().min(1),
  resolved: z.boolean(),
  note: z.string().trim().max(2000).optional().or(z.literal("")),
});

// FR-IT-05: IT marks an error resolved (or reopens it) with a resolution note.
// IT is the ONLY role that can touch ErrorLog — it has no business write path.
export async function resolveError(values: unknown): Promise<ActionResult> {
  const it = await requireRole("IT");
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { id, resolved, note } = parsed.data;

  await db.errorLog.update({
    where: { id },
    data: {
      resolvedFlag: resolved,
      resolvedById: resolved ? it.id : null,
      resolvedAt: resolved ? new Date() : null,
      resolutionNote: resolved ? (note || null) : null,
    },
  });

  revalidatePath("/it");
  return { ok: true, info: resolved ? "Marked resolved" : "Reopened" };
}
