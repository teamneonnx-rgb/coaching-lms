import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare, Layers, CheckCircle2, MessageCircle } from "lucide-react";
import { requireRole } from "@/lib/session";
import { getActiveBatch } from "@/lib/student";
import { getStudentDoubts, getBatchCourseOptions } from "@/lib/discussion";
import { formatDate } from "@/lib/date";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { AskDoubtDialog } from "@/components/discussion/ask-doubt-dialog";

export const metadata: Metadata = { title: "Doubts" };

export default async function StudentDoubtsPage() {
  const user = await requireRole("STUDENT");
  const batch = await getActiveBatch(user.id);
  if (!batch) {
    return (
      <div className="p-4 lg:p-8">
        <EmptyState icon={Layers} title="No active batch" description="You aren't enrolled in a batch yet." />
      </div>
    );
  }

  const [doubts, courses] = await Promise.all([
    getStudentDoubts(batch.id, user.id),
    getBatchCourseOptions(batch.id),
  ]);

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Doubts</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ask your teachers · {batch.name}</p>
        </div>
        <AskDoubtDialog courses={courses} />
      </div>

      {doubts.length === 0 ? (
        <EmptyState icon={MessagesSquare} title="No doubts yet" description="Ask your first doubt — your teacher will be notified." />
      ) : (
        <div className="space-y-3">
          {doubts.map((d) => (
            <Link key={d.id} href={`/student/doubts/${d.id}`}>
              <Card className="border-none shadow-sm transition-shadow hover:shadow-md">
                <CardContent className="flex items-start justify-between gap-4 p-4">
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
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
