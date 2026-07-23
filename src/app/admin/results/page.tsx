import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAdminArea } from "@/lib/session";
import { hasCapability } from "@/lib/capabilities";
import { db } from "@/lib/db";
import { ResultsManager, type ExamGroup } from "@/components/admin/results-manager";

export const metadata: Metadata = { title: "Results" };

// FR-AD-52..55: results entry (per-batch marks sheet), publish per exam,
// audited edits with re-notification. RESULT_MANAGE capability.
export default async function AdminResultsPage() {
  const user = await requireAdminArea();
  if (!(await hasCapability(user, "RESULT_MANAGE"))) redirect("/admin");

  const [batches, results] = await Promise.all([
    db.batch.findMany({
      where: { deletedAt: null, isActive: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        enrollments: {
          where: { isActive: true },
          orderBy: { student: { name: "asc" } },
          select: { student: { select: { id: true, name: true } } },
        },
      },
    }),
    db.result.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: { student: { select: { name: true } } },
    }),
  ]);

  const batchName = new Map(batches.map((b) => [b.id, b.name]));
  const groups = new Map<string, ExamGroup>();
  for (const r of results) {
    const key = `${r.batchId}|${r.examName}`;
    if (!groups.has(key)) {
      groups.set(key, {
        batchId: r.batchId ?? "",
        batchName: batchName.get(r.batchId ?? "") ?? "—",
        examName: r.examName,
        published: true,
        rows: [],
      });
    }
    const g = groups.get(key)!;
    if (!r.publishedAt) g.published = false; // any unpublished row = exam unpublished
    g.rows.push({
      id: r.id,
      studentName: r.student.name ?? "Student",
      marksObtained: r.marksObtained,
      maxMarks: r.maxMarks,
      grade: r.grade,
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Results</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Enter marks, then publish per exam — students and parents see nothing until you publish.
        </p>
      </div>
      <ResultsManager
        batches={batches.map((b) => ({
          id: b.id,
          name: b.name,
          students: b.enrollments.map((e) => ({ id: e.student.id, name: e.student.name ?? "Student" })),
        }))}
        examGroups={[...groups.values()]}
      />
    </div>
  );
}
