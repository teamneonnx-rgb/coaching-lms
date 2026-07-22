import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  PlayCircle,
  FileText,
  CheckCircle2,
  FolderOpen,
} from "lucide-react";
import { requireRole } from "@/lib/session";
import {
  getActiveBatch,
  getCourseForStudent,
  getCompletedResourceIds,
} from "@/lib/student";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { EmptyState } from "@/components/empty-state";
import { getStudentFeedback } from "@/lib/discussion";
import { CourseFeedback } from "@/components/discussion/course-feedback";

export const metadata: Metadata = { title: "Course" };

function formatDuration(seconds: number | null): string | null {
  if (!seconds) return null;
  const m = Math.round(seconds / 60);
  return `${m} min`;
}

export default async function StudentCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const user = await requireRole("STUDENT");
  const batch = await getActiveBatch(user.id);
  if (!batch) notFound();

  // Batch isolation: null unless the course is in the student's active batch.
  const course = await getCourseForStudent(user.id, courseId, batch.id);
  if (!course) notFound();

  const [completed, myFeedback] = await Promise.all([
    getCompletedResourceIds(user.id, batch.id),
    getStudentFeedback(courseId, user.id),
  ]);

  return (
    <div className="mx-auto max-w-4xl p-4 lg:p-8">
      <Link
        href="/student/courses"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-slate-900"
      >
        <ArrowLeft className="size-4" /> Back to courses
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{course.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {course.batch.name} · by {course.teacher.name}
        </p>
        {course.description ? (
          <p className="mt-2 text-sm text-slate-600">{course.description}</p>
        ) : null}
      </div>

      {course.chapters.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="No chapters yet"
          description="This course doesn't have any content yet."
        />
      ) : (
        <Accordion
          type="multiple"
          defaultValue={course.chapters.map((ch) => ch.id)}
          className="space-y-3"
        >
          {course.chapters.map((chapter) => (
            <AccordionItem
              key={chapter.id}
              value={chapter.id}
              className="rounded-lg border border-slate-200 px-4"
            >
              <AccordionTrigger className="text-sm font-medium hover:no-underline">
                {chapter.title}
                <span className="ml-auto mr-2 text-xs font-normal text-muted-foreground">
                  {chapter.resources.length} items
                </span>
              </AccordionTrigger>
              <AccordionContent>
                {chapter.resources.length === 0 ? (
                  <p className="py-2 text-sm text-muted-foreground">No resources in this chapter.</p>
                ) : (
                  <ul className="space-y-1">
                    {chapter.resources.map((r) => {
                      const isDone = completed.has(r.id);
                      return (
                        <li key={r.id}>
                          <Link
                            href={`/student/resources/${r.id}`}
                            className="flex items-center gap-3 rounded-lg px-2 py-2 hover:bg-slate-50"
                          >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                              {r.type === "VIDEO" ? (
                                <PlayCircle className="size-4" />
                              ) : (
                                <FileText className="size-4" />
                              )}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-900">{r.title}</p>
                              <p className="text-xs text-muted-foreground">
                                {r.type === "VIDEO"
                                  ? formatDuration(r.duration) ?? "Video"
                                  : "PDF"}
                              </p>
                            </div>
                            {isDone ? (
                              <CheckCircle2 className="size-4 shrink-0 text-green-500" />
                            ) : null}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <div className="mt-8">
        <CourseFeedback
          courseId={course.id}
          initialRating={myFeedback?.rating ?? 0}
          initialComment={myFeedback?.comment ?? ""}
        />
      </div>
    </div>
  );
}
