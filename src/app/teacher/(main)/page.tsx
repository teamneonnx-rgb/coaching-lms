import type { Metadata } from "next";
import Link from "next/link";
import { Layers, BookOpen, Users, CalendarCheck } from "lucide-react";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { getTeacherBatches, getRecentAttendance } from "@/lib/teacher";
import { formatDate } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";

export const metadata: Metadata = { title: "Dashboard" };

export default async function TeacherDashboard() {
  const user = await requireRole("TEACHER");

  const [batches, courseCount, studentCount, recent] = await Promise.all([
    getTeacherBatches(user.id),
    db.course.count({ where: { teacherId: user.id } }),
    db.enrollment.count({
      where: { isActive: true, batch: { courses: { some: { teacherId: user.id } } } },
    }),
    getRecentAttendance(user.id, 6),
  ]);

  const metrics = [
    { label: "My batches", value: batches.length, icon: Layers, tint: "bg-teal-50 text-teal-600" },
    { label: "My courses", value: courseCount, icon: BookOpen, tint: "bg-blue-50 text-blue-600" },
    { label: "Students", value: studentCount, icon: Users, tint: "bg-violet-50 text-violet-600" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">
            Hi {user.name?.split(" ")[0]} 👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Here&apos;s your teaching overview.</p>
        </div>
        <Button asChild className="bg-teal-600 text-white hover:bg-teal-600/90">
          <Link href="/teacher/attendance">
            <CalendarCheck className="size-4" /> Mark attendance
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {metrics.map((m) => (
          <Card key={m.label} className="border-slate-200 transition-shadow hover:shadow-md">
            <CardContent className="flex items-center gap-3 p-4">
              <span className={`flex size-10 items-center justify-center rounded-lg ${m.tint}`}>
                <m.icon className="size-5" />
              </span>
              <div>
                <p className="text-2xl font-semibold text-slate-900">{m.value}</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">My attendance (admin-recorded)</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <EmptyState icon={CalendarCheck} title="No records yet" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent.map((r) => (
                  <li key={r.id} className="flex items-center justify-between py-2.5">
                    <p className="text-sm font-medium text-slate-900">{formatDate(r.date)}</p>
                    <AttendanceStatusBadge status={r.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
