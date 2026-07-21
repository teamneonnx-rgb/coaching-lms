import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireRole } from "@/lib/session";
import { getManageableCourse } from "@/lib/content";
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

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/teacher/content"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-slate-900"
      >
        <ArrowLeft className="size-4" /> Back to content
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{course.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{course.batch.name}</p>
      </div>
      <CourseContentManager courseId={course.id} chapters={course.chapters} accent="teal" />
    </div>
  );
}
