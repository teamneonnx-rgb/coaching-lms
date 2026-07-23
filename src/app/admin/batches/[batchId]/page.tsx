import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminArea } from "@/lib/session";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EnrollmentManager } from "@/components/admin/enrollment-manager";
import { AssignTeacher } from "@/components/admin/assign-teacher";

export const metadata: Metadata = { title: "Batch" };

// FR-AD-07/09: batch metadata (name, teacher, schedule, capacity, filled
// seats) + enrolled students, with the drill-down breadcrumb retained.
// Student rows link onward to the student profile carrying the trail.
export default async function AdminBatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ batchId: string }>;
  searchParams: Promise<{ teacherId?: string }>;
}) {
  await requireAdminArea();
  const { batchId } = await params;
  const sp = await searchParams;

  const batch = await db.batch.findUnique({
    where: { id: batchId },
    include: {
      teacher: { select: { id: true, name: true } },
      enrollments: {
        where: { isActive: true },
        include: { student: { select: { id: true, name: true, email: true } } },
        orderBy: { student: { name: "asc" } },
      },
    },
  });
  if (!batch) notFound();

  const crumbTeacher = sp.teacherId && batch.teacher?.id === sp.teacherId ? batch.teacher : null;
  const filled = batch.enrollments.length;

  const enrolledIds = batch.enrollments.map((e) => e.student.id);
  // Students not actively enrolled in this batch (candidates to add).
  const available = await db.user.findMany({
    where: { role: "STUDENT", deletedAt: null, id: { notIn: enrolledIds.length ? enrolledIds : ["_none_"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  const trail = `?batchId=${batch.id}${crumbTeacher ? `&teacherId=${crumbTeacher.id}` : ""}`;

  const allTeachers = await db.user.findMany({
    where: { role: "TEACHER", deletedAt: null },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <nav className="mb-4 text-sm text-muted-foreground">
        {crumbTeacher ? (
          <>
            <Link href="/admin/teachers" className="hover:underline">Teachers</Link>
            <span className="mx-1.5">/</span>
            <Link href={`/admin/teachers/${crumbTeacher.id}`} className="hover:underline">{crumbTeacher.name}</Link>
            <span className="mx-1.5">/</span>
          </>
        ) : (
          <>
            <Link href="/admin/batches" className="hover:underline">Batches</Link>
            <span className="mx-1.5">/</span>
          </>
        )}
        <span className="text-slate-900">{batch.name}</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{batch.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {batch.teacher ? `Teacher: ${batch.teacher.name}` : "No owning teacher yet"}
          {batch.scheduleDays ? ` · ${batch.scheduleDays}` : ""}
          {batch.scheduleTime ? ` ${batch.scheduleTime}` : ""}
          {` · ${filled}${batch.capacity ? `/${batch.capacity}` : ""} seat(s) filled`}
          {batch.isActive ? "" : " · Archived"}
        </p>
        {batch.description ? (
          <p className="mt-1 text-sm text-muted-foreground">{batch.description}</p>
        ) : null}
      </div>

      <Card className="mb-6 border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Teacher &amp; schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <AssignTeacher
            batchId={batch.id}
            currentTeacherId={batch.teacher?.id ?? null}
            teachers={allTeachers.map((t) => ({ id: t.id, name: t.name ?? "Teacher" }))}
            scheduleDays={batch.scheduleDays}
            scheduleTime={batch.scheduleTime}
            capacity={batch.capacity}
          />
        </CardContent>
      </Card>

      <Card className="mb-6 border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Students ({filled})</CardTitle>
        </CardHeader>
        <CardContent>
          {filled === 0 ? (
            <p className="text-sm text-muted-foreground">No students enrolled yet.</p>
          ) : (
            <ul className="space-y-1.5">
              {batch.enrollments.map((e) => (
                <li key={e.student.id}>
                  <Link
                    href={`/admin/students/${e.student.id}${trail}`}
                    className="flex items-center justify-between rounded-md px-3 py-2 transition-colors hover:bg-slate-50"
                  >
                    <span className="text-sm font-medium text-slate-900">{e.student.name}</span>
                    <span className="text-xs text-muted-foreground">{e.student.email}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Enrollment</CardTitle>
        </CardHeader>
        <CardContent>
          <EnrollmentManager
            batchId={batch.id}
            enrolled={batch.enrollments.map((e) => e.student)}
            available={available}
          />
        </CardContent>
      </Card>
    </div>
  );
}
