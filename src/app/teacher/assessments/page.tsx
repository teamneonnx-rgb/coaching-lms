import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, Plus, FileText, ListChecks, Circle, CheckCircle2 } from "lucide-react";
import { requireRole } from "@/lib/session";
import {
  getTeacherCoursesWithAssessments,
  getAssessmentForEdit,
  getAssessmentWithSubmissions,
} from "@/lib/assessments";
import { cn } from "@/lib/utils";
import { EmptyState } from "@/components/empty-state";
import { AssessmentBuilder } from "@/components/teacher/assessment-builder";
import { SubmissionsPanel } from "@/components/teacher/submissions-panel";

export const metadata: Metadata = { title: "Assessments" };

export default async function AssessmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string; assessmentId?: string; mode?: string; tab?: string }>;
}) {
  const teacher = await requireRole("TEACHER");
  const courses = await getTeacherCoursesWithAssessments(teacher.id);
  const sp = await searchParams;

  const activeCourseId =
    sp.courseId && courses.some((c) => c.id === sp.courseId) ? sp.courseId : courses[0]?.id;
  const activeCourse = courses.find((c) => c.id === activeCourseId);
  const courseOptions = courses.map((c) => ({ id: c.id, title: c.title }));

  const isNew = sp.mode === "new";
  const showSubmissions = sp.tab === "submissions" && !!sp.assessmentId;

  const editing =
    sp.assessmentId && !showSubmissions
      ? await getAssessmentForEdit(sp.assessmentId, teacher.id)
      : null;
  const submissionsView = showSubmissions
    ? await getAssessmentWithSubmissions(sp.assessmentId!, teacher.id)
    : null;

  return (
    <>
      {/* Tier 2 — Courses (w-56) */}
      <aside className="hidden w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-100 lg:flex">
        <p className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Courses
        </p>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
          {courses.length === 0 ? (
            <p className="px-2 text-sm text-muted-foreground">No courses assigned.</p>
          ) : (
            courses.map((c) => (
              <Link
                key={c.id}
                href={`/teacher/assessments?courseId=${c.id}`}
                className={cn(
                  "block rounded-md px-3 py-2 text-sm transition-colors",
                  c.id === activeCourseId
                    ? "bg-white font-medium text-teal-700 shadow-sm"
                    : "text-slate-600 hover:bg-slate-200"
                )}
              >
                {c.title}
                <span className="block text-xs text-muted-foreground">{c.batch.name}</span>
              </Link>
            ))
          )}
        </nav>
      </aside>

      {/* Tier 3 — Assessments (w-64) */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white lg:flex">
        <div className="flex items-center justify-between px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Assessments
          </p>
          {activeCourseId ? (
            <Link
              href={`/teacher/assessments?courseId=${activeCourseId}&mode=new`}
              className="inline-flex items-center gap-1 rounded-md bg-teal-600 px-2 py-1 text-xs font-medium text-white hover:bg-teal-600/90"
            >
              <Plus className="size-3" /> Add Quiz
            </Link>
          ) : null}
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2">
          {!activeCourse || activeCourse.assessments.length === 0 ? (
            <p className="px-2 text-sm text-muted-foreground">No assessments yet.</p>
          ) : (
            activeCourse.assessments.map((a) => {
              const active = a.id === sp.assessmentId;
              return (
                <Link
                  key={a.id}
                  href={`/teacher/assessments?courseId=${activeCourseId}&assessmentId=${a.id}`}
                  className={cn(
                    "block rounded-md px-3 py-2 transition-colors",
                    active ? "bg-slate-100" : "hover:bg-slate-50"
                  )}
                >
                  <span className="flex items-center gap-2">
                    {a.type === "OBJECTIVE" ? (
                      <ListChecks className="size-3.5 text-slate-500" />
                    ) : (
                      <FileText className="size-3.5 text-slate-500" />
                    )}
                    <span className="flex-1 truncate text-sm font-medium text-slate-900">{a.title}</span>
                    {a.isPublished ? (
                      <CheckCircle2 className="size-3.5 text-green-500" />
                    ) : (
                      <Circle className="size-3.5 text-slate-300" />
                    )}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {a.type === "OBJECTIVE" ? `${a._count.questions} Q` : "Subjective"} ·{" "}
                    {a._count.submissions} sub
                  </span>
                </Link>
              );
            })
          )}
        </nav>
      </aside>

      {/* Main canvas (flex-1) */}
      <section className="flex-1 overflow-y-auto bg-slate-50">
        <p className="border-b border-slate-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-800 lg:hidden">
          The builder works best on a larger screen.
        </p>
        <div className="p-4 lg:p-6">
          {submissionsView ? (
            <SubmissionsPanel
              assessmentId={submissionsView.id}
              title={submissionsView.title}
              type={submissionsView.type}
              courseId={activeCourseId!}
              submissions={submissionsView.submissions.map((s) => ({
                id: s.id,
                studentName: s.student.name,
                studentEmail: s.student.email,
                status: s.status,
                score: s.score,
                maxScore: s.maxScore,
                feedback: s.feedback,
                hasFile: Boolean(s.fileKey),
                submittedAt: s.submittedAt.toISOString(),
              }))}
            />
          ) : isNew || editing ? (
            <AssessmentBuilder
              courses={courseOptions}
              defaultCourseId={activeCourseId!}
              assessment={
                editing
                  ? {
                      id: editing.id,
                      title: editing.title,
                      description: editing.description,
                      type: editing.type,
                      courseId: editing.courseId,
                      negativeMarking: editing.negativeMarking,
                      timeLimit: editing.timeLimit,
                      isPublished: editing.isPublished,
                      submissionCount: editing._count.submissions,
                      questions: editing.questions.map((q) => ({
                        id: q.id,
                        text: q.text,
                        points: q.points,
                        options: q.options.map((o) => ({
                          id: o.id,
                          text: o.text,
                          isCorrect: o.isCorrect,
                        })),
                      })),
                    }
                  : null
              }
            />
          ) : (
            <EmptyState
              icon={ClipboardList}
              title="Select or create an assessment"
              description="Pick a course, then choose an assessment or click “Add Quiz”."
            />
          )}
        </div>
      </section>
    </>
  );
}
