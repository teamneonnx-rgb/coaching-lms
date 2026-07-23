"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { DEFAULT_INSTITUTE_ID } from "@/lib/settings";

export type ActionResult = { ok: boolean; error?: string; info?: string };

// Allowed setting keys per section (whitelist — never store arbitrary keys).
const SECTION_KEYS: Record<string, string[]> = {
  razorpay: ["razorpay.keyId", "razorpay.keySecret", "razorpay.mode", "razorpay.enabled"],
  whatsapp: [
    "whatsapp.phoneNumberId",
    "whatsapp.businessAccountId",
    "whatsapp.accessToken",
    "whatsapp.enabled",
  ],
  email: ["email.resendApiKey", "email.fromEmail"],
  sms: ["sms.twilioSid", "sms.twilioToken", "sms.twilioFrom"],
};

// Secret keys: a blank submitted value means "keep the existing secret".
const SECRET_KEYS = new Set([
  "razorpay.keySecret",
  "whatsapp.accessToken",
  "email.resendApiKey",
  "sms.twilioToken",
]);

const schema = z.object({
  section: z.enum(["razorpay", "whatsapp", "email", "sms"]),
  values: z.record(z.string(), z.string()),
});

export async function saveSettings(input: unknown): Promise<ActionResult> {
  // PRD screen inventory: "Global settings" belongs to Super Admin only.
  const admin = await requireUser();
  if (admin.role !== "SUPER_ADMIN") return { ok: false, error: "Only the Super Admin can change integration settings" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { section, values } = parsed.data;

  const actor = await db.user.findUnique({
    where: { id: admin.id },
    select: { instituteId: true },
  });
  const instituteId = actor?.instituteId ?? DEFAULT_INSTITUTE_ID;

  const allowed = SECTION_KEYS[section];
  for (const key of allowed) {
    if (!(key in values)) continue;
    const value = values[key] ?? "";
    // Skip blank secrets so masked fields don't wipe a stored credential.
    if (SECRET_KEYS.has(key) && value.trim() === "") continue;

    await db.setting.upsert({
      where: { instituteId_key: { instituteId, key } },
      update: { value },
      create: { instituteId, key, value },
    });
  }

  await logAudit({
    actorId: admin.id,
    actorRole: admin.role,
    action: "settings.update",
    entity: "Setting",
    detail: section,
  });

  revalidatePath("/admin/control-center");
  return { ok: true, info: "Saved" };
}
