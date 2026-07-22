import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare, CheckCircle2, MessageCircle } from "lucide-react";
import { requireRole } from "@/lib/session";
import { getTeacherDoubts } from "@/lib/discussion";
import { formatDate } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Doubts" };

export default async function TeacherDoubtsPage() {
  const teacher = await requireRole("TEACHER");
  const doubts = await getTeacherDoubts(teacher.id);
  const open = doubts.filter((d) => !d.isResolved).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Doubts</h1>
        <p className="mt-1 text-sm text-muted-foreground">Questions from your students · {open} open</p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">All doubts ({doubts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {doubts.length === 0 ? (
            <EmptyState icon={MessagesSquare} title="No doubts yet" description="When students ask questions on your courses, they show up here." />
          ) : (
            <div className="space-y-3">
              {doubts.map((d) => (
                <Link key={d.id} href={`/teacher/doubts/${d.id}`}>
                  <div className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 p-4 transition-colors hover:bg-slate-50">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-slate-900">{d.title}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {d.course.title} · {d.author.name} · {formatDate(d.createdAt)}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MessageCircle className="size-3.5" /> {d._count.replies}
                      </span>
                      {d.isResolved ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          <CheckCircle2 className="size-3" /> Resolved
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Open</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
