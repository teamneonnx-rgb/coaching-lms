"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/capabilities";
import { sendWelcomeEmail } from "@/lib/notifications/events";

export type ActionResult = { ok: boolean; error?: string; info?: string };

const BCRYPT_ROUNDS = 12;

// ── Enrollment management (FR-BAT-4) ───────────────────────────────

export async function enrollStudents(values: {
  batchId: string;
  studentIds: string[];
}): Promise<ActionResult> {
  await requireCapability("STUDENT_MANAGE");
  const schema = z.object({ batchId: z.string().min(1), studentIds: z.array(z.string().min(1)) });
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };
  const { batchId, studentIds } = parsed.data;
  if (studentIds.length === 0) return { ok: false, error: "Select at least one student" };

  // Only enroll users that are actually students.
  const students = await db.user.findMany({
    where: { id: { in: studentIds }, role: "STUDENT" },
    select: { id: true },
  });

  for (const s of students) {
    await db.enrollment.upsert({
      where: { studentId_batchId: { studentId: s.id, batchId } },
      update: { isActive: true },
      create: { studentId: s.id, batchId, isActive: true },
    });
  }

  revalidatePath(`/admin/batches/${batchId}`);
  revalidatePath("/admin/batches");
  return { ok: true, info: `Enrolled ${students.length} student(s)` };
}

export async function unenrollStudent(values: {
  batchId: string;
  studentId: string;
}): Promise<ActionResult> {
  await requireCapability("STUDENT_MANAGE");
  const schema = z.object({ batchId: z.string().min(1), studentId: z.string().min(1) });
  const parsed = schema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  // Soft-remove: keep the row (attendance/marks history) but mark inactive (FR-BAT-5).
  await db.enrollment.updateMany({
    where: { batchId: parsed.data.batchId, studentId: parsed.data.studentId },
    data: { isActive: false },
  });

  revalidatePath(`/admin/batches/${parsed.data.batchId}`);
  return { ok: true, info: "Student removed from batch" };
}

// ── Bulk student import (FR-BLK-1/2) ───────────────────────────────

export type ImportResult = {
  ok: boolean;
  error?: string;
  created?: { name: string; email: string; tempPassword: string }[];
  skipped?: { email: string; reason: string }[];
};

const importRowSchema = z.object({
  name: z.string().trim().min(2),
  email: z.string().trim().email(),
  parentName: z.string().trim().optional(),
  parentPhone: z.string().trim().optional(),
  parentEmail: z.string().trim().optional(),
});

function tempPassword(): string {
  return "Temp@" + Math.random().toString(36).slice(2, 8);
}

function parseCsv(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.split(",").map((c) => c.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => (row[h] = cells[i] ?? ""));
    return row;
  });
}

// Import students from CSV text. Header: name,email,parentName,parentPhone,parentEmail
// Optionally enroll all created students into batchId.
export async function bulkImportStudents(input: {
  csv: string;
  batchId?: string;
}): Promise<ImportResult> {
  await requireCapability("STUDENT_BULK_IMPORT");

  const rows = parseCsv(input.csv);
  if (rows.length === 0) return { ok: false, error: "No data rows found (need a header row + at least one row)" };
  if (rows.length > 500) return { ok: false, error: "Import is limited to 500 rows at a time" };

  const created: { name: string; email: string; tempPassword: string }[] = [];
  const skipped: { email: string; reason: string }[] = [];

  for (const raw of rows) {
    const parsed = importRowSchema.safeParse({
      name: raw.name,
      email: raw.email,
      parentName: raw.parentname,
      parentPhone: raw.parentphone,
      parentEmail: raw.parentemail,
    });
    if (!parsed.success) {
      skipped.push({ email: raw.email || "(blank)", reason: parsed.error.issues[0]?.message ?? "invalid" });
      continue;
    }
    const data = parsed.data;
    const email = data.email.toLowerCase();

    const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
    if (existing) {
      skipped.push({ email, reason: "email already exists" });
      continue;
    }

    const pw = tempPassword();
    const student = await db.user.create({
      data: {
        name: data.name,
        email,
        password: await bcrypt.hash(pw, BCRYPT_ROUNDS),
        role: "STUDENT",
        mustChangePassword: true, // FR-AU-02
        parentName: data.parentName || null,
        parentPhone: data.parentPhone || null,
        parentEmail: data.parentEmail || null,
      },
      select: { id: true },
    });

    if (input.batchId) {
      await db.enrollment.upsert({
        where: { studentId_batchId: { studentId: student.id, batchId: input.batchId } },
        update: { isActive: true },
        create: { studentId: student.id, batchId: input.batchId, isActive: true },
      });
    }

    await sendWelcomeEmail(email, data.name);
    created.push({ name: data.name, email, tempPassword: pw });
  }

  revalidatePath("/admin/users");
  revalidatePath("/admin/batches");
  if (input.batchId) revalidatePath(`/admin/batches/${input.batchId}`);
  return { ok: true, created, skipped };
}
