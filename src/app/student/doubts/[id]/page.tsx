import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Layers } from "lucide-react";
import { requireRole } from "@/lib/session";
import { getActiveBatch } from "@/lib/student";
import { getDoubtForStudent } from "@/lib/discussion";
import { formatDate } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { DoubtThread } from "@/components/discussion/doubt-thread";

export const metadata: Metadata = { title: "Doubt" };

export default async function StudentDoubtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireRole("STUDENT");
  const batch = await getActiveBatch(user.id);
  if (!batch) {
    return (
      <div className="p-4 lg:p-8">
        <EmptyState icon={Layers} title="No active batch" />
      </div>
    );
  }

  const doubt = await getDoubtForStudent(id, batch.id);
  if (!doubt) notFound();

  const replies = doubt.replies.map((r) => ({
    id: r.id,
    authorName: r.author.name ?? "User",
    authorRole: r.author.role,
    body: r.body,
    isAccepted: r.isAccepted,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-3xl p-4 lg:p-8">
      <Link href="/student/doubts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-slate-900">
        <ArrowLeft className="size-4" /> Back to doubts
      </Link>

      <Card className="mb-6 border-none shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">{doubt.title}</CardTitle>
          <p className="text-xs text-muted-foreground">
            {doubt.course.title} · {doubt.author.name} · {formatDate(doubt.createdAt)}
          </p>
        </CardHeader>
        <CardContent>
          <p className="whitespace-pre-wrap text-sm text-slate-700">{doubt.body}</p>
        </CardContent>
      </Card>

      <DoubtThread
        doubtId={doubt.id}
        isResolved={doubt.isResolved}
        canResolve={doubt.authorId === user.id}
        canAccept={false}
        accent="orange"
        replies={replies}
      />
    </div>
  );
}
