import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Layers, Star } from "lucide-react";
import { requireAdminArea } from "@/lib/session";
import { hasCapability } from "@/lib/capabilities";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Teacher" };

// FR-AD-06 + FR-AD-24: teacher profile, their batches (owned + delivering),
// and the aggregate rating from student feedback. Breadcrumb retained.
export default async function AdminTeacherProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdminArea();
  if (!(await hasCapability(user, "TEACHER_VIEW"))) redirect("/admin");
  const { id } = await params;

  const teacher = await db.user.findFirst({
    where: { id, role: "TEACHER", deletedAt: null },
    select: {
      id: true, name: true, email: true, phone: true, status: true,
      subjectSpecialisation: true, qualification: true, employeeCode: true, joiningDate: true,
    },
  });
  if (!teacher) notFound();

  const [batches, rating] = await Promise.all([
    db.batch.findMany({
      where: {
        deletedAt: null,
        OR: [{ teacherId: id }, { courseLinks: { some: { course: { teacherId: id, deletedAt: null } } } }],
      },
      orderBy: { name: "asc" },
      select: {
        id: true, name: true, isActive: true, capacity: true, scheduleDays: true, scheduleTime: true,
        _count: { select: { enrollments: { where: { isActive: true } } } },
      },
    }),
    // FR-AD-24: aggregate rating derived from student feedback on their courses.
    db.feedback.aggregate({
      where: { course: { teacherId: id } },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  return (
    <div>
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/teachers" className="hover:underline">Teachers</Link>
        <span className="mx-1.5">/</span>
        <span className="text-slate-900">{teacher.name}</span>
      </nav>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{teacher.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {teacher.email}
            {teacher.phone ? ` · ${teacher.phone}` : ""}
            {teacher.subjectSpecialisation ? ` · ${teacher.subjectSpecialisation}` : ""}
            {teacher.qualification ? ` · ${teacher.qualification}` : ""}
          </p>
        </div>
        {rating._count._all > 0 ? (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
            <Star className="size-5 fill-orange-400 text-orange-400" />
            <div className="leading-tight">
              <p className="text-sm font-semibold text-slate-900">{(rating._avg.rating ?? 0).toFixed(1)}/5</p>
              <p className="text-[11px] text-muted-foreground">{rating._count._all} rating(s)</p>
            </div>
          </div>
        ) : null}
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Batches ({batches.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <EmptyState icon={Layers} title="No batches" />
          ) : (
            <ul className="space-y-2">
              {batches.map((b) => (
                <li key={b.id}>
                  <Link
                    href={`/admin/batches/${b.id}?teacherId=${teacher.id}`}
                    className="flex items-center justify-between rounded-lg border border-slate-200 px-4 py-3 transition-colors hover:bg-slate-50"
                  >
                    <span>
                      <span className="block font-medium text-slate-900">{b.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {b._count.enrollments} student(s)
                        {b.capacity ? ` / ${b.capacity} seats` : ""}
                        {b.scheduleDays ? ` · ${b.scheduleDays}` : ""}
                        {b.scheduleTime ? ` ${b.scheduleTime}` : ""}
                      </span>
                    </span>
                    <span className={b.isActive
                      ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                      : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"}>
                      {b.isActive ? "Active" : "Archived"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
