import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen } from "lucide-react";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/empty-state";
import { CourseFormDialog } from "@/components/admin/courses/course-form-dialog";
import { CourseRowActions } from "@/components/admin/courses/course-row-actions";

export const metadata: Metadata = { title: "Courses" };

export default async function AdminCoursesPage() {
  const [courses, batchList, teacherList] = await Promise.all([
    db.course.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        batch: { select: { name: true } },
        teacher: { select: { name: true } },
        _count: { select: { chapters: true } },
      },
    }),
    db.batch.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.user.findMany({
      where: { role: "TEACHER", deletedAt: null },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const batches = batchList.map((b) => ({ id: b.id, label: b.name }));
  const teachers = teacherList.map((t) => ({ id: t.id, label: t.name }));

  return (
    <div>
      <PageHeader
        title="Courses"
        description="Assign courses to batches and owning teachers."
        action={<CourseFormDialog batches={batches} teachers={teachers} />}
      />

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">All courses ({courses.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title="No courses yet"
              description="Create a course and assign it to a batch and teacher."
              action={<CourseFormDialog batches={batches} teachers={teachers} />}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Batch</TableHead>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Chapters</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium text-slate-900">
                        <Link href={`/admin/courses/${c.id}`} className="hover:text-blue-600 hover:underline">
                          {c.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-slate-600">{c.batch.name}</TableCell>
                      <TableCell className="text-slate-600">{c.teacher.name}</TableCell>
                      <TableCell className="text-slate-600">{c._count.chapters}</TableCell>
                      <TableCell className="text-right">
                        <CourseRowActions
                          course={{
                            id: c.id,
                            title: c.title,
                            description: c.description,
                            batchId: c.batchId,
                            teacherId: c.teacherId,
                          }}
                          batches={batches}
                          teachers={teachers}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
