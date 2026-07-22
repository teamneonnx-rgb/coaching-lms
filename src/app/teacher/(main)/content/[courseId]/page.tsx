import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Star } from "lucide-react";
import { requireRole } from "@/lib/session";
import { getManageableCourse } from "@/lib/content";
import { getCourseFeedbackSummary } from "@/lib/discussion";
import { CourseContentManager } from "@/components/content/course-content-manager";

export const metadata: Metadata = { title: "Course content" };

export default async function TeacherCourseContentPage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const teacher = await requireRole("TEACHER");
  const course = await getManageableCourse(teacher.id, teacher.role, courseId);
  if (!course) notFound();

  const feedback = await getCourseFeedbackSummary(course.id);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/teacher/content"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-slate-900"
      >
        <ArrowLeft className="size-4" /> Back to content
      </Link>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{course.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{course.batch.name}</p>
        </div>
        {feedback.count > 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <Star className="size-5 fill-orange-400 text-orange-400" />
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-900">{feedback.average.toFixed(1)}</p>
              <p className="text-[11px] text-muted-foreground">{feedback.count} rating{feedback.count > 1 ? "s" : ""}</p>
            </div>
          </div>
        ) : null}
      </div>
      <CourseContentManager courseId={course.id} chapters={course.chapters} accent="teal" />
    </div>
  );
}
