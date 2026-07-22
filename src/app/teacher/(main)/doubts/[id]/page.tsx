import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/session";
import { getDoubtForTeacher } from "@/lib/discussion";
import { formatDate } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DoubtThread } from "@/components/discussion/doubt-thread";

export const metadata: Metadata = { title: "Doubt" };

export default async function TeacherDoubtPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const teacher = await requireRole("TEACHER");
  const doubt = await getDoubtForTeacher(id, teacher.id);
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
    <div className="mx-auto max-w-3xl">
      <Link href="/teacher/doubts" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-slate-900">
        <ArrowLeft className="size-4" /> Back to doubts
      </Link>

      <Card className="mb-6 border-slate-200">
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
        canResolve={true}
        canAccept={true}
        accent="teal"
        replies={replies}
      />
    </div>
  );
}
