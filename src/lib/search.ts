import "server-only";
import { db } from "@/lib/db";
import { getActiveBatch } from "@/lib/student";
import { getParentChildren } from "@/lib/parent";

// FR-SR: every role has scoped search. Scoping is applied IN THE QUERY (never a
// post-filter) so a role can never surface data outside its permission.

export type SearchGroup = { label: string; items: { title: string; subtitle?: string; href?: string }[] };

const like = (q: string) => ({ contains: q, mode: "insensitive" as const });

// ── Admin (SUPER_ADMIN / ADMIN): students by name/batch, teachers, courses,
//    batches, enquiries, payments (FR-AD-14/15). ─────────────────────
export async function adminSearch(q: string): Promise<SearchGroup[]> {
  const [students, teachers, batches, courses, enquiries] = await Promise.all([
    db.user.findMany({
      where: {
        role: "STUDENT", deletedAt: null,
        // FR-AD-14: by student name OR by batch name.
        OR: [{ name: like(q) }, { email: like(q) }, { enrollments: { some: { batch: { name: like(q) } } } }],
      },
      take: 8, select: { id: true, name: true, email: true },
    }),
    db.user.findMany({ where: { role: "TEACHER", deletedAt: null, OR: [{ name: like(q) }, { email: like(q) }, { subjectSpecialisation: like(q) }] }, take: 6, select: { id: true, name: true, email: true } }),
    db.batch.findMany({ where: { deletedAt: null, name: like(q) }, take: 6, select: { id: true, name: true } }),
    db.course.findMany({ where: { deletedAt: null, OR: [{ title: like(q) }, { subject: like(q) }] }, take: 6, select: { id: true, title: true } }),
    db.enquiry.findMany({ where: { OR: [{ name: like(q) }, { phone: like(q) }, { email: like(q) }] }, take: 6, select: { id: true, name: true, status: true } }),
  ]);

  return [
    { label: "Students", items: students.map((s) => ({ title: s.name ?? "Student", subtitle: s.email, href: `/admin/students/${s.id}` })) },
    { label: "Teachers", items: teachers.map((t) => ({ title: t.name ?? "Teacher", subtitle: t.email, href: `/admin/teachers/${t.id}` })) },
    { label: "Batches", items: batches.map((b) => ({ title: b.name, href: `/admin/batches/${b.id}` })) },
    { label: "Courses", items: courses.map((c) => ({ title: c.title, href: `/admin/courses/${c.id}` })) },
    { label: "Enquiries", items: enquiries.map((e) => ({ title: e.name, subtitle: e.status, href: `/admin/enquiries` })) },
  ].filter((g) => g.items.length > 0);
}

// ── Teacher: own batches, own students, own course material (FR-TE-10). ─
export async function teacherSearch(teacherId: string, q: string): Promise<SearchGroup[]> {
  const batchWhere = { OR: [{ teacherId }, { courseLinks: { some: { course: { teacherId, deletedAt: null } } } }] };
  const [batches, students, resources] = await Promise.all([
    db.batch.findMany({ where: { deletedAt: null, name: like(q), ...batchWhere }, take: 6, select: { id: true, name: true } }),
    db.user.findMany({
      where: { role: "STUDENT", deletedAt: null, OR: [{ name: like(q) }, { email: like(q) }], enrollments: { some: { isActive: true, batch: batchWhere } } },
      take: 8, select: { id: true, name: true, email: true },
    }),
    db.resource.findMany({ where: { title: like(q), chapter: { course: { teacherId } } }, take: 8, select: { id: true, title: true, type: true } }),
  ]);
  return [
    { label: "Batches", items: batches.map((b) => ({ title: b.name })) },
    { label: "Students", items: students.map((s) => ({ title: s.name ?? "Student", subtitle: s.email })) },
    { label: "Course material", items: resources.map((r) => ({ title: r.title, subtitle: r.type })) },
  ].filter((g) => g.items.length > 0);
}

// ── Student: own courses/batches/topics/material (FR-ST-06). ─────────
export async function studentSearch(studentId: string, q: string): Promise<SearchGroup[]> {
  const batch = await getActiveBatch(studentId);
  if (!batch) return [];
  const inBatch = { batches: { some: { batchId: batch.id } } };
  const [courses, resources] = await Promise.all([
    db.course.findMany({ where: { ...inBatch, deletedAt: null, OR: [{ title: like(q) }, { subject: like(q) }] }, take: 6, select: { id: true, title: true } }),
    db.resource.findMany({
      where: { approvalStatus: "APPROVED", title: like(q), chapter: { course: inBatch } },
      take: 8, select: { id: true, title: true, type: true, chapter: { select: { title: true } } },
    }),
  ]);
  return [
    { label: "My courses", items: courses.map((c) => ({ title: c.title, href: `/student/courses/${c.id}` })) },
    { label: "Material", items: resources.map((r) => ({ title: r.title, subtitle: `${r.chapter.title} · ${r.type}`, href: `/student/resources/${r.id}` })) },
  ].filter((g) => g.items.length > 0);
}

// ── Parent: ward's results, sessions, payments (FR-PA-07). ───────────
export async function parentSearch(parentId: string, q: string): Promise<SearchGroup[]> {
  const children = await getParentChildren(parentId);
  const childIds = children.map((c) => c.id);
  if (childIds.length === 0) return [];
  const [results, payments] = await Promise.all([
    db.result.findMany({ where: { studentId: { in: childIds }, publishedAt: { not: null }, OR: [{ examName: like(q) }, { subject: like(q) }] }, take: 8, select: { examName: true, subject: true, marksObtained: true, maxMarks: true } }),
    db.payment.findMany({ where: { studentId: { in: childIds }, title: like(q) }, take: 6, select: { title: true, status: true, amountDue: true, amountPaid: true } }),
  ]);
  return [
    { label: "Results", items: results.map((r) => ({ title: `${r.examName}${r.subject ? ` · ${r.subject}` : ""}`, subtitle: `${r.marksObtained}/${r.maxMarks}` })) },
    { label: "Fees", items: payments.map((p) => ({ title: p.title, subtitle: `${p.status} · ₹${p.amountPaid}/${p.amountDue}` })) },
  ].filter((g) => g.items.length > 0);
}
