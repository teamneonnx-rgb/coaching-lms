"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireCapability, hasCapability } from "@/lib/capabilities";
import { sendWelcomeEmail } from "@/lib/notifications/events";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: boolean; error?: string; info?: string };

const enquirySchema = z.object({
  name: z.string().trim().min(2, "Name is required").max(100),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  interestedCourse: z.string().trim().max(120).optional().or(z.literal("")),
  source: z.string().trim().max(60).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

// FR-AD-25: manual enquiry entry (public form is a possible later add).
export async function createEnquiry(values: unknown): Promise<ActionResult> {
  const admin = await requireCapability("ENQUIRY_VIEW");
  const parsed = enquirySchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const created = await db.enquiry.create({
    data: {
      name: d.name,
      phone: d.phone || null,
      email: d.email?.toLowerCase() || null,
      interestedCourse: d.interestedCourse || null,
      source: d.source || null,
      notes: d.notes || null,
    },
    select: { id: true },
  });

  await logAudit({ actorId: admin.id, actorRole: admin.role, action: "enquiry.create", entity: "Enquiry", entityId: created.id, detail: d.name });
  revalidatePath("/admin/enquiries");
  return { ok: true, info: "Enquiry added" };
}

const updateSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["NEW", "CONTACTED", "CONVERTED", "LOST"]),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

// FR-AD-26: status flow new → contacted → converted / lost, plus notes.
export async function updateEnquiry(values: unknown): Promise<ActionResult> {
  const admin = await requireCapability("ENQUIRY_VIEW");
  const parsed = updateSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { id, status, notes } = parsed.data;

  const before = await db.enquiry.findUnique({ where: { id }, select: { status: true, notes: true } });
  if (!before) return { ok: false, error: "Enquiry not found" };

  await db.enquiry.update({
    where: { id },
    data: { status, notes: notes || null },
  });
  await logAudit({
    actorId: admin.id, actorRole: admin.role, action: "enquiry.update", entity: "Enquiry", entityId: id,
    beforeValue: JSON.stringify(before), afterValue: JSON.stringify({ status, notes }),
  });
  revalidatePath("/admin/enquiries");
  return { ok: true, info: "Updated" };
}

// FR-AD-27: promote a converted enquiry straight into a student record,
// carrying over name, phone and email. Needs STUDENT_MANAGE on top of
// ENQUIRY_VIEW because it mints an account.
export async function convertEnquiry(id: string): Promise<ActionResult & { tempPassword?: string }> {
  const admin = await requireCapability("ENQUIRY_VIEW");
  if (!(await hasCapability(admin, "STUDENT_MANAGE"))) {
    return { ok: false, error: "403 — converting needs the STUDENT_MANAGE capability" };
  }

  const enquiry = await db.enquiry.findUnique({ where: { id } });
  if (!enquiry) return { ok: false, error: "Enquiry not found" };
  if (enquiry.convertedUserId) return { ok: false, error: "Already converted" };
  if (!enquiry.email) return { ok: false, error: "Add an email to the enquiry first — it becomes the student's login" };

  const email = enquiry.email.toLowerCase();
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { ok: false, error: "A user with this email already exists" };

  const actorRecord = await db.user.findUnique({ where: { id: admin.id }, select: { instituteId: true } });
  const tempPassword = `Join@${Math.random().toString(36).slice(2, 8)}${Math.floor(Math.random() * 90 + 10)}`;

  const student = await db.user.create({
    data: {
      name: enquiry.name,
      email,
      phone: enquiry.phone || null,
      password: await bcrypt.hash(tempPassword, 12),
      role: "STUDENT",
      instituteId: actorRecord?.instituteId ?? null,
      createdById: admin.id,
      mustChangePassword: true, // FR-AU-02
    },
    select: { id: true },
  });

  await db.enquiry.update({
    where: { id },
    data: { status: "CONVERTED", convertedUserId: student.id },
  });

  await sendWelcomeEmail(email, enquiry.name);
  await logAudit({
    actorId: admin.id, actorRole: admin.role, action: "enquiry.convert",
    entity: "Enquiry", entityId: id, detail: `${enquiry.name} → student ${email}`,
  });

  revalidatePath("/admin/enquiries");
  revalidatePath("/admin/users");
  return { ok: true, tempPassword, info: `Converted — share the temporary password securely` };
}
