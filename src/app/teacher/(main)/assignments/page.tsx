import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardList, FolderOpen } from "lucide-react";
import { requireRole } from "@/lib/session";
import { getTeacherAssignments, getTeacherCourseOptions } from "@/lib/assignments";
import { formatDate } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";
import { AssignmentFormDialog } from "@/components/teacher/assignment-form-dialog";

export const metadata: Metadata = { title: "Assignments" };

export default async function TeacherAssignmentsPage() {
  const teacher = await requireRole("TEACHER");
  const [assignments, courses] = await Promise.all([
    getTeacherAssignments(teacher.id),
    getTeacherCourseOptions(teacher.id),
  ]);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Assignments</h1>
          <p className="mt-1 text-sm text-muted-foreground">Set work and grade submissions.</p>
        </div>
        <AssignmentFormDialog courses={courses} />
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">All assignments ({assignments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No assignments yet"
              description={courses.length === 0 ? "You need a course first." : "Create your first assignment."}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Title</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Submissions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignments.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium text-slate-900">
                        <Link href={`/teacher/assignments/${a.id}`} className="inline-flex items-center gap-2 hover:text-teal-700 hover:underline">
                          <ClipboardList className="size-4 text-slate-400" /> {a.title}
                        </Link>
                      </TableCell>
                      <TableCell className="text-slate-600">{a.course.title}</TableCell>
                      <TableCell className="text-slate-600">{a.dueDate ? formatDate(a.dueDate) : "—"}</TableCell>
                      <TableCell className="text-slate-600">{a.totalMarks}</TableCell>
                      <TableCell className="text-slate-600">{a._count.submissions}</TableCell>
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
