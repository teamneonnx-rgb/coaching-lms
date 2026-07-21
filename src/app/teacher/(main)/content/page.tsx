import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, FolderPlus } from "lucide-react";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Content" };

export default async function TeacherContentPage() {
  const teacher = await requireRole("TEACHER");
  const courses = await db.course.findMany({
    where: { teacherId: teacher.id },
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      batch: { select: { name: true } },
      _count: { select: { chapters: true } },
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Content</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Add chapters and video/PDF resources to your courses.
        </p>
      </div>

      {courses.length === 0 ? (
        <EmptyState
          icon={FolderPlus}
          title="No courses yet"
          description="An admin needs to assign you a course before you can add content."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Link key={c.id} href={`/teacher/content/${c.id}`}>
              <Card className="h-full border-slate-200 transition-shadow hover:shadow-md">
                <CardContent className="p-5">
                  <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
                    <BookOpen className="size-5" />
                  </div>
                  <p className="font-medium text-slate-900">{c.title}</p>
                  <p className="text-xs text-muted-foreground">{c.batch.name}</p>
                  <p className="mt-2 text-xs text-muted-foreground">{c._count.chapters} chapters</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
