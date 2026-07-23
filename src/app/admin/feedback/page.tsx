import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MessagesSquare, Star } from "lucide-react";
import { requireAdminArea } from "@/lib/session";
import { hasCapability } from "@/lib/capabilities";
import { db } from "@/lib/db";
import { getFeedbackInbox } from "@/lib/discussion";
import { formatDate } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Feedback" };

// FR-AD-22/23: read all student + parent feedback; filter by teacher, batch,
// submitter role. Requires FEEDBACK_VIEW.
export default async function AdminFeedbackPage({
  searchParams,
}: {
  searchParams: Promise<{ teacherId?: string; batchId?: string; role?: string }>;
}) {
  const user = await requireAdminArea();
  if (!(await hasCapability(user, "FEEDBACK_VIEW"))) redirect("/admin");
  const sp = await searchParams;

  const [items, teachers, batches] = await Promise.all([
    getFeedbackInbox({ teacherId: sp.teacherId, batchId: sp.batchId, role: sp.role }),
    db.user.findMany({ where: { role: "TEACHER", deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.batch.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  const qs = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { teacherId: sp.teacherId, batchId: sp.batchId, role: sp.role, ...patch };
    for (const [k, v] of Object.entries(merged)) if (v) params.set(k, String(v));
    const s = params.toString();
    return s ? `/admin/feedback?${s}` : "/admin/feedback";
  };
  const chip = (active: boolean) =>
    `rounded-full px-3 py-1 text-xs font-medium ${active ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`;

  const avg = items.length ? (items.reduce((a, i) => a + i.rating, 0) / items.length).toFixed(1) : "—";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Feedback inbox</h1>
        <p className="mt-1 text-sm text-muted-foreground">{items.length} entries · average {avg}/5</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader className="space-y-3">
          <CardTitle className="text-base">Filters</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Submitter:</span>
            <Link href={qs({ role: undefined })} className={chip(!sp.role)}>All</Link>
            <Link href={qs({ role: "STUDENT" })} className={chip(sp.role === "STUDENT")}>Student</Link>
            <Link href={qs({ role: "PARENT" })} className={chip(sp.role === "PARENT")}>Parent</Link>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Teacher:</span>
            <Link href={qs({ teacherId: undefined })} className={chip(!sp.teacherId)}>All</Link>
            {teachers.map((t) => (
              <Link key={t.id} href={qs({ teacherId: t.id })} className={chip(sp.teacherId === t.id)}>{t.name}</Link>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Batch:</span>
            <Link href={qs({ batchId: undefined })} className={chip(!sp.batchId)}>All</Link>
            {batches.map((b) => (
              <Link key={b.id} href={qs({ batchId: b.id })} className={chip(sp.batchId === b.id)}>{b.name}</Link>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyState icon={MessagesSquare} title="No feedback matches" />
          ) : (
            <ul className="space-y-3">
              {items.map((i) => (
                <li key={i.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 text-sm font-medium text-slate-900">
                      <Star className="size-3.5 fill-orange-400 text-orange-400" /> {i.rating}/5
                    </span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">{i.byRole}</span>
                    <span className="text-xs text-muted-foreground">
                      {i.target}
                      {i.teacherName ? ` · ${i.teacherName}` : ""}
                      {i.batchNames.length ? ` · ${i.batchNames.join(", ")}` : ""}
                      {i.period ? ` · ${i.period}` : ""} · {formatDate(i.createdAt)}
                    </span>
                  </div>
                  {i.comment ? <p className="text-sm text-slate-700">{i.comment}</p> : <p className="text-xs italic text-muted-foreground">No comment</p>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
