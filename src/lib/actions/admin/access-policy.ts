"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { DEFAULT_INSTITUTE_ID } from "@/lib/settings";
import { POLICY_KEYS, type AccessPolicy } from "@/lib/access-policy";

export type ActionResult = { ok: boolean; error?: string; info?: string };

const schema = z.object({
  contentApproval: z.boolean(),
  publicDoubts: z.boolean(),
  studentComments: z.boolean(),
});

// PRD "Global settings": only the Super Admin may change institute policies.
export async function saveAccessPolicy(input: unknown): Promise<ActionResult> {
  const admin = await requireUser();
  if (admin.role !== "SUPER_ADMIN") return { ok: false, error: "Only the Super Admin can change access policies" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const values = parsed.data;

  const actor = await db.user.findUnique({
    where: { id: admin.id },
    select: { instituteId: true },
  });
  const instituteId = actor?.instituteId ?? DEFAULT_INSTITUTE_ID;

  for (const field of Object.keys(POLICY_KEYS) as (keyof AccessPolicy)[]) {
    const key = POLICY_KEYS[field];
    const value = values[field] ? "true" : "false";
    await db.setting.upsert({
      where: { instituteId_key: { instituteId, key } },
      update: { value },
      create: { instituteId, key, value },
    });
  }

  await logAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "access-policy.update",
    entity: "Setting",
    detail: `approval=${values.contentApproval} publicDoubts=${values.publicDoubts} comments=${values.studentComments}`,
  });

  revalidatePath("/admin/access-control");
  return { ok: true, info: "Access policy saved" };
}
