import type { Metadata } from "next";
import Link from "next/link";
import {
  Layers,
  BookOpen,
  Users,
  CalendarCheck,
  ClipboardCheck,
  MessagesSquare,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
import { getTeacherBatches, getRecentAttendance } from "@/lib/teacher";
import { formatDate } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { AttendanceStatusBadge } from "@/components/attendance/attendance-status-badge";

export const metadata: Metadata = { title: "Dashboard" };

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function TeacherDashboard() {
  const user = await requireRole("TEACHER");
  const now = new Date();

  const [batches, courseCount, studentCount, recent, pendingEval, openDoubts] = await Promise.all([
    getTeacherBatches(user.id),
    db.course.count({ where: { teacherId: user.id } }),
    db.enrollment.count({
      where: { isActive: true, batch: { courses: { some: { teacherId: user.id } } } },
    }),
    getRecentAttendance(user.id, 6),
    db.submission.count({
      where: { evaluationStatus: "PARTIAL_AWAITING_EVALUATION", assessment: { teacherId: user.id } },
    }),
    db.doubt.count({ where: { course: { teacherId: user.id }, deletedAt: null, isResolved: false } }),
  ]);

  const toReview = pendingEval + openDoubts;
  const firstName = (user.name ?? "there").split(" ")[0];

  const metrics = [
    { label: "My batches", value: batches.length, sub: "assigned", icon: Layers, tint: "bg-teal-50 text-teal-600" },
    { label: "My courses", value: courseCount, sub: "published", icon: BookOpen, tint: "bg-blue-50 text-blue-600" },
    { label: "Students", value: studentCount, sub: "enrolled", icon: Users, tint: "bg-violet-50 text-violet-600" },
    { label: "To review", value: toReview, sub: "evals + doubts", icon: ClipboardCheck, tint: "bg-amber-50 text-amber-600" },
  ];

  const attention = [
    { label: "Long-answer evaluations", count: pendingEval, href: "/teacher/evaluations", icon: ClipboardCheck },
    { label: "Open student doubts", count: openDoubts, href: "/teacher/doubts", icon: MessagesSquare },
  ];

  return (
    <div className="space-y-6">
      {/* Greeting banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 via-teal-600 to-emerald-700 p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 right-24 size-40 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-teal-100">{greeting(now.getHours())}, {firstName} 👋</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Your teaching overview</h1>
            <p className="mt-2 text-sm text-teal-100">
              {batches.length} {batches.length === 1 ? "batch" : "batches"} · {studentCount} students
              {toReview > 0 ? ` · ${toReview} to review` : " · all caught up"}
            </p>
          </div>
          <Link
            href="/teacher/attendance"
            className="inline-flex w-fit items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-teal-700 shadow-sm transition-colors hover:bg-teal-50"
          >
            <CalendarCheck className="size-4" /> Mark attendance
          </Link>
        </div>
      </section>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label} className="border-slate-200 transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <span className={`flex size-10 items-center justify-center rounded-lg ${m.tint}`}>
                <m.icon className="size-5" />
              </span>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{m.value}</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-slate-600">{m.label}</span> · {m.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Needs attention */}
        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Needs attention</CardTitle>
            {toReview > 0 && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">{toReview}</span>
            )}
          </CardHeader>
          <CardContent>
            {toReview === 0 ? (
              <EmptyState icon={Sparkles} title="All caught up" description="No evaluations or doubts waiting on you." />
            ) : (
              <ul className="space-y-1">
                {attention.map((a) => (
                  <li key={a.label}>
                    <Link href={a.href} className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50">
                      <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg ${a.count > 0 ? "bg-amber-50 text-amber-600" : "bg-slate-100 text-slate-400"}`}>
                        <a.icon className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1 text-sm font-medium text-slate-700">{a.label}</span>
                      {a.count > 0 ? (
                        <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">{a.count}</span>
                      ) : (
                        <span className="text-xs text-slate-400">Clear</span>
                      )}
                      <ChevronRight className="size-4 shrink-0 text-slate-300" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent admin-recorded attendance */}
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
