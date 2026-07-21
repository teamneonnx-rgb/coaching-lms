import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Layers } from "lucide-react";
import { requireRole } from "@/lib/session";
import { getActiveBatch, getStudentCourses } from "@/lib/student";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "My Courses" };

export default async function StudentCoursesPage() {
  const user = await requireRole("STUDENT");
  const batch = await getActiveBatch(user.id);

  if (!batch) {
    return (
      <div className="p-4 lg:p-8">
        <EmptyState
          icon={Layers}
          title="No active batch"
          description="You haven't been enrolled in a batch yet."
        />
      </div>
    );
  }

  const courses = await getStudentCourses(user.id, batch.id);

  return (
    <div className="p-4 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">My Courses</h1>
        <p className="mt-1 text-sm text-muted-foreground">{batch.name}</p>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No courses yet"
          description="Your teachers haven't added any courses to this batch."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => {
            const resourceCount = c.chapters.reduce((n, ch) => n + ch._count.resources, 0);
            return (
              <Link key={c.id} href={`/student/courses/${c.id}`}>
                <Card className="h-full border-none shadow-sm transition-shadow hover:shadow-md">
                  <CardContent className="p-5">
                    <div className="mb-3 flex size-11 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                      <BookOpen className="size-5" />
                    </div>
                    <p className="font-medium text-slate-900">{c.title}</p>
                    {c.description ? (
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                    ) : null}
                    <p className="mt-3 text-xs text-muted-foreground">
                      by {c.teacher.name} · {c._count.chapters} chapters · {resourceCount} resources
                    </p>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
