"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/capabilities";
import { getParentUserIds } from "@/lib/payments";
import { notifyUser } from "@/lib/notifications/events";
import { logAudit } from "@/lib/audit";

export type ActionResult = { ok: boolean; error?: string; info?: string };

const sheetSchema = z.object({
  batchId: z.string().min(1, "Select a batch"),
  examName: z.string().trim().min(2, "Exam name required").max(120),
  subject: z.string().trim().max(80).optional().or(z.literal("")),
  examDate: z.string().optional().or(z.literal("")),
  maxMarks: z.coerce.number().positive().max(1000),
  rows: z.array(z.object({ studentId: z.string().min(1), marks: z.coerce.number().min(0) })).min(1, "Enter at least one mark"),
});

function gradeFor(pct: number): string {
  if (pct >= 90) return "A+";
  if (pct >= 75) return "A";
  if (pct >= 60) return "B";
  if (pct >= 45) return "C";
  if (pct >= 33) return "D";
  return "F";
}

// FR-AD-52/53: Admin enters results — full batch marks sheet in one action
// (single-student entry is just a one-row sheet). Unpublished until FR-AD-54.
export async function enterBatchResults(values: unknown): Promise<ActionResult> {
  const admin = await requireCapability("RESULT_MANAGE");
  const parsed = sheetSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  const d = parsed.data;

  const enrolled = await db.enrollment.findMany({
    where: { batchId: d.batchId, isActive: true, studentId: { in: d.rows.map((r) => r.studentId) } },
    select: { studentId: true },
  });
  const enrolledSet = new Set(enrolled.map((e) => e.studentId));

  let saved = 0;
  for (const row of d.rows) {
    if (!enrolledSet.has(row.studentId)) continue;
    if (row.marks > d.maxMarks) return { ok: false, error: `Marks can't exceed ${d.maxMarks}` };
    const grade = gradeFor((row.marks / d.maxMarks) * 100);
    const existing = await db.result.findFirst({
      where: { studentId: row.studentId, batchId: d.batchId, examName: d.examName },
      select: { id: true },
    });
    if (existing) {
      await db.result.update({
        where: { id: existing.id },
        data: { marksObtained: row.marks, maxMarks: d.maxMarks, grade, subject: d.subject || null },
      });
    } else {
      await db.result.create({
        data: {
          studentId: row.studentId,
          batchId: d.batchId,
          examName: d.examName,
          examDate: d.examDate ? new Date(d.examDate) : null,
          subject: d.subject || null,
          maxMarks: d.maxMarks,
          marksObtained: row.marks,
          grade,
          enteredById: admin.id,
        },
      });
    }
    saved++;
  }

  await logAudit({
    actorId: admin.id, actorRole: admin.role, action: "result.enter",
    entity: "Result", detail: `${d.examName} · ${saved} student(s)`,
  });
  revalidatePath("/admin/results");
  return { ok: true, info: `Saved ${saved} result(s) — unpublished` };
}

// FR-AD-54: publish per exam → visible to student + parent views + notified.
export async function publishExam(values: { batchId: string; examName: string }): Promise<ActionResult> {
  const admin = await requireCapability("RESULT_MANAGE");
  const rows = await db.result.findMany({
    where: { batchId: values.batchId, examName: values.examName, publishedAt: null },
    include: { student: { select: { id: true, name: true } } },
  });
  if (rows.length === 0) return { ok: false, error: "Nothing unpublished for that exam" };

  await db.result.updateMany({
    where: { batchId: values.batchId, examName: values.examName, publishedAt: null },
    data: { publishedAt: new Date() },
  });

  for (const r of rows) {
    const msg = {
      title: "Result published",
      message: `${r.examName}: ${r.student.name} scored ${r.marksObtained}/${r.maxMarks}${r.grade ? ` (${r.grade})` : ""}.`,
    };
    const parentIds = await getParentUserIds(r.studentId);
    await Promise.all([notifyUser(r.studentId, msg), ...parentIds.map((id) => notifyUser(id, msg))]);
  }

  await logAudit({
    actorId: admin.id, actorRole: admin.role, action: "result.publish",
    entity: "Result", detail: `${values.examName} · ${rows.length} student(s)`,
  });
  revalidatePath("/admin/results");
  revalidatePath("/student/results");
  revalidatePath("/parent");
  return { ok: true, info: `Published ${rows.length} result(s) — students and parents notified` };
}

const editSchema = z.object({
  id: z.string().min(1),
  marksObtained: z.coerce.number().min(0),
});

// FR-AD-55: edit a result — if already published, audited with before/after
// and both student and parent are re-notified.
export async function updateResult(values: unknown): Promise<ActionResult> {
  const admin = await requireCapability("RESULT_MANAGE");
  const parsed = editSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Invalid input" };

  const result = await db.result.findUnique({
    where: { id: parsed.data.id },
    include: { student: { select: { id: true, name: true } } },
  });
  if (!result) return { ok: false, error: "Result not found" };
  if (parsed.data.marksObtained > result.maxMarks) {
    return { ok: false, error: `Marks can't exceed ${result.maxMarks}` };
  }

  const grade = gradeFor((parsed.data.marksObtained / result.maxMarks) * 100);
  await db.result.update({
    where: { id: result.id },
    data: { marksObtained: parsed.data.marksObtained, grade },
  });

  await logAudit({
    actorId: admin.id, actorRole: admin.role, action: "result.edit",
    entity: "Result", entityId: result.id, detail: `${result.examName} · ${result.student.name}`,
    beforeValue: JSON.stringify({ marksObtained: result.marksObtained, grade: result.grade }),
    afterValue: JSON.stringify({ marksObtained: parsed.data.marksObtained, grade }),
  });

  if (result.publishedAt) {
    const msg = {
      title: "Result updated",
      message: `${result.examName}: ${result.student.name}'s marks were revised to ${parsed.data.marksObtained}/${result.maxMarks} (${grade}).`,
    };
    const parentIds = await getParentUserIds(result.studentId);
    await Promise.all([notifyUser(result.studentId, msg), ...parentIds.map((id) => notifyUser(id, msg))]);
  }

  revalidatePath("/admin/results");
  revalidatePath("/student/results");
  return { ok: true, info: result.publishedAt ? "Updated — student and parent re-notified" : "Updated" };
}
