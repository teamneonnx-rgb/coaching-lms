import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, PlayCircle, FileText, AlertTriangle } from "lucide-react";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { getActiveBatch, getResourceForStudent } from "@/lib/student";
import { getSignedResourceUrl, isStorageConfigured } from "@/lib/storage";
import { getResourceComments } from "@/lib/discussion";
import { MarkCompleteButton } from "@/components/student/mark-complete-button";
import { ResourceComments } from "@/components/discussion/resource-comments";

export const metadata: Metadata = { title: "Resource" };

// Signed media URLs must never be cached (they expire); render fresh each request.
export const dynamic = "force-dynamic";

export default async function StudentResourcePage({
  params,
}: {
  params: Promise<{ resourceId: string }>;
}) {
  const { resourceId } = await params;
  const user = await requireRole("STUDENT");
  const batch = await getActiveBatch(user.id);
  if (!batch) notFound();

  // Batch isolation: only resources within the student's active batch resolve.
  const resource = await getResourceForStudent(resourceId, batch.id);
  if (!resource) notFound();

  // A pasted URL (http/https) is used directly; an S3/R2 object key is signed.
  const isUrl = /^https?:\/\//i.test(resource.fileKey);
  const [signedUrl, progress, commentRows] = await Promise.all([
    isUrl ? Promise.resolve(resource.fileKey) : getSignedResourceUrl(resource.fileKey), // FR-COURSE-03
    db.resourceProgress.findUnique({
      where: { studentId_resourceId: { studentId: user.id, resourceId: resource.id } },
      select: { id: true },
    }),
    getResourceComments(resource.id),
  ]);

  const completed = Boolean(progress);
  const comments = commentRows.map((c) => ({
    id: c.id,
    authorName: c.author.name ?? "User",
    authorRole: c.author.role,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    isMine: c.authorId === user.id,
  }));

  return (
    <div className="mx-auto max-w-4xl p-4 lg:p-8">
      <Link
        href={`/student/courses/${resource.chapter.course.id}`}
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-slate-900"
      >
        <ArrowLeft className="size-4" /> {resource.chapter.course.title}
      </Link>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-md bg-slate-100 text-slate-600">
              {resource.type === "VIDEO" ? <PlayCircle className="size-4" /> : <FileText className="size-4" />}
            </span>
            <h1 className="text-xl font-semibold text-slate-900">{resource.title}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{resource.chapter.title}</p>
        </div>
        <MarkCompleteButton resourceId={resource.id} completed={completed} />
      </div>

      {/* Media viewer */}
      {!signedUrl ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-amber-300 bg-amber-50 px-6 py-16 text-center">
          <AlertTriangle className="size-8 text-amber-500" />
          <p className="text-sm font-medium text-amber-800">Media storage not configured</p>
          <p className="max-w-md text-sm text-amber-700">
            {isStorageConfigured()
              ? "This resource could not be loaded."
              : "Add S3/R2 credentials to .env to stream video and PDF content."}
          </p>
        </div>
      ) : resource.type === "VIDEO" ? (
        <video
          controls
          controlsList="nodownload"
          className="aspect-video w-full rounded-lg border border-slate-200 bg-black"
          src={signedUrl}
        >
          Your browser does not support the video tag.
        </video>
      ) : (
        <iframe
          title={resource.title}
          src={signedUrl}
          className="h-[75vh] w-full rounded-lg border border-slate-200"
        />
      )}

      <ResourceComments resourceId={resource.id} comments={comments} />
    </div>
  );
}
