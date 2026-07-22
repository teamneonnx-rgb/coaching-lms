import type { Metadata } from "next";
import { CheckCircle2, PlayCircle, FileText } from "lucide-react";
import { requireAdminArea } from "@/lib/session";
import { isFullAdmin } from "@/lib/roles";
import { getPendingResources } from "@/lib/approvals";
import { formatDate } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { ApprovalActions } from "@/components/admin/approval-actions";

export const metadata: Metadata = { title: "Approvals" };

export default async function AdminApprovalsPage() {
  const user = await requireAdminArea();
  const canReview = isFullAdmin(user.role);
  const pending = await getPendingResources();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Approvals</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Teacher-submitted content awaiting review (FR-APR).
          {canReview ? "" : " You have read-only access."}
        </p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Pending content ({pending.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="All caught up" description="No content is waiting for approval." />
          ) : (
            <ul className="space-y-3">
              {pending.map((r) => (
                <li key={r.id} className="flex flex-col gap-3 rounded-lg border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                      {r.type === "VIDEO" ? <PlayCircle className="size-4" /> : <FileText className="size-4" />}
                    </span>
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900">{r.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.chapter.course.title} · {r.chapter.title} · {r.chapter.course.batch.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        by {r.chapter.course.teacher.name} · {formatDate(r.createdAt)}
                      </p>
                    </div>
                  </div>
                  {canReview ? (
                    <ApprovalActions resourceId={r.id} />
                  ) : (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Pending</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
