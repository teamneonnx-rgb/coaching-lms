import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, PlayCircle, FileText, Layers, CalendarDays } from "lucide-react";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import {
  getActiveBatch,
  getStudentCourses,
  getStudentProgress,
} from "@/lib/student";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { ProgressDonut } from "@/components/student/progress-donut";
import { StudentCalendar } from "@/components/student/student-calendar";

export const metadata: Metadata = { title: "Dashboard" };

export default async function StudentDashboard() {
  const user = await requireRole("STUDENT");
  const batch = await getActiveBatch(user.id);

  if (!batch) {
    return (
      <div className="p-4 lg:p-8">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">
          Hi {user.name?.split(" ")[0]} 👋
        </h1>
        <EmptyState
          icon={Layers}
          title="No active batch yet"
          description="You haven't been enrolled in a batch. Please contact your institute admin."
        />
      </div>
    );
  }

  const [progress, courses, recentResources] = await Promise.all([
    getStudentProgress(user.id, batch.id),
    getStudentCourses(user.id, batch.id),
    db.resource.findMany({
      where: { chapter: { course: { batches: { some: { batchId: batch.id } } } } },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: {
        id: true,
        title: true,
        type: true,
        createdAt: true,
        chapter: { select: { course: { select: { title: true } } } },
      },
    }),
  ]);

  const videoCount = recentResources.filter((r) => r.type === "VIDEO").length;
  const eventDates = recentResources.map((r) => r.createdAt.toISOString().slice(0, 10));

  return (
    <div className="flex flex-col xl:flex-row">
      {/* Main content */}
      <div className="flex-1 space-y-6 p-4 lg:p-8">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Hi {user.name?.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You&apos;re in <span className="font-medium text-slate-700">{batch.name}</span>. Keep going!
          </p>
        </div>

        {/* Progress + quick stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="border-none shadow-sm md:col-span-1">
            <CardHeader>
              <CardTitle className="text-base">Your progress</CardTitle>
            </CardHeader>
            <CardContent>
              <ProgressDonut done={progress.done} total={progress.total} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-4 md:col-span-2">
            <StatCard icon={BookOpen} tint="bg-orange-50 text-orange-600" label="Courses" value={courses.length} />
            <StatCard icon={Layers} tint="bg-blue-50 text-blue-600" label="Total resources" value={progress.total} />
            <StatCard icon={PlayCircle} tint="bg-pink-100 text-pink-600" label="Videos" value={videoCount} />
            <StatCard icon={FileText} tint="bg-violet-50 text-violet-600" label="Completed" value={progress.done} />
          </div>
        </div>

        {/* Courses */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">My courses</h2>
            <Link href="/student/courses" className="text-sm font-medium text-orange-600 hover:underline">
              View all
            </Link>
          </div>
          {courses.length === 0 ? (
            <EmptyState icon={BookOpen} title="No courses yet" description="Your teachers haven't added courses to this batch." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {courses.slice(0, 4).map((c) => {
                const resourceCount = c.chapters.reduce((n, ch) => n + ch._count.resources, 0);
                return (
                  <Link key={c.id} href={`/student/courses/${c.id}`}>
                    <Card className="border-none shadow-sm transition-shadow hover:shadow-md">
                      <CardContent className="p-4">
                        <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                          <BookOpen className="size-5" />
                        </div>
                        <p className="font-medium text-slate-900">{c.title}</p>
                        <p className="text-xs text-muted-foreground">by {c.teacher.name}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {c._count.chapters} chapters · {resourceCount} resources
                        </p>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right schedule sidebar (w-80) */}
      <aside className="w-full shrink-0 space-y-6 border-t border-slate-100 p-4 xl:w-80 xl:border-t-0 xl:border-l xl:p-6">
        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4 text-orange-500" /> Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="flex justify-center">
            <StudentCalendar eventDates={eventDates} />
          </CardContent>
        </Card>

        <Card className="border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">Recently added</CardTitle>
          </CardHeader>
          <CardContent>
            {recentResources.length === 0 ? (
              <EmptyState icon={FileText} title="Nothing yet" />
            ) : (
              <ul className="space-y-3">
                {recentResources.map((r) => (
                  <li key={r.id}>
                    <Link href={`/student/resources/${r.id}`} className="flex items-start gap-3 rounded-lg p-2 hover:bg-slate-50">
                      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                        {r.type === "VIDEO" ? <PlayCircle className="size-4" /> : <FileText className="size-4" />}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{r.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{r.chapter.course.title}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}

function StatCard({
  icon: Icon,
  tint,
  label,
  value,
}: {
  icon: typeof BookOpen;
  tint: string;
  label: string;
  value: number;
}) {
  return (
    <Card className="border-none shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <span className={`flex size-10 items-center justify-center rounded-lg ${tint}`}>
          <Icon className="size-5" />
        </span>
        <div>
          <p className="text-xl font-semibold text-slate-900">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
