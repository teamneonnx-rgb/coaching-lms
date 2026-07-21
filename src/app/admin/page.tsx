import type { Metadata } from "next";
import {
  Users as UsersIcon,
  GraduationCap,
  Presentation,
  Layers,
  BookOpen,
  Activity,
} from "lucide-react";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/empty-state";
import {
  EnrollmentChart,
  type ChartPoint,
} from "@/components/admin/dashboard/enrollment-chart";
import { RoleBadge } from "@/components/admin/role-badge";
import type { LucideIcon } from "lucide-react";

export const metadata: Metadata = { title: "Dashboard" };

// Buckets user signups into the last 6 calendar months for the line chart.
function buildMonthlySeries(dates: Date[]): ChartPoint[] {
  const months: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleString("en", { month: "short" }),
    });
  }
  const counts = new Map(months.map((m) => [m.key, 0]));
  for (const date of dates) {
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    if (counts.has(key)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return months.map((m) => ({ label: m.label, count: counts.get(m.key) ?? 0 }));
}

type Metric = { label: string; value: number; icon: LucideIcon; tint: string };

export default async function AdminDashboard() {
  const [studentCount, teacherCount, adminCount, batchCount, courseCount, signupDates, recentUsers] =
    await Promise.all([
      db.user.count({ where: { role: "STUDENT" } }),
      db.user.count({ where: { role: "TEACHER" } }),
      db.user.count({ where: { role: "ADMIN" } }),
      db.batch.count(),
      db.course.count(),
      db.user.findMany({ select: { createdAt: true } }),
      db.user.findMany({
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, name: true, role: true, createdAt: true },
      }),
    ]);

  const totalUsers = studentCount + teacherCount + adminCount;
  const series = buildMonthlySeries(signupDates.map((u) => u.createdAt));

  const metrics: Metric[] = [
    { label: "Total Users", value: totalUsers, icon: UsersIcon, tint: "bg-blue-50 text-blue-600" },
    { label: "Students", value: studentCount, icon: GraduationCap, tint: "bg-slate-100 text-slate-700" },
    { label: "Teachers", value: teacherCount, icon: Presentation, tint: "bg-teal-50 text-teal-600" },
    { label: "Batches", value: batchCount, icon: Layers, tint: "bg-amber-50 text-amber-600" },
    { label: "Courses", value: courseCount, icon: BookOpen, tint: "bg-violet-50 text-violet-600" },
  ];

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview of your institute." />

      {/* Top metrics — responsive grid per UI spec */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4 lg:grid-cols-5">
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

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* User Learning Graph */}
        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">User growth</CardTitle>
          </CardHeader>
          <CardContent>
            <EnrollmentChart data={series} />
          </CardContent>
        </Card>

        {/* Recent activity timeline */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recentUsers.length === 0 ? (
              <EmptyState icon={Activity} title="No activity yet" />
            ) : (
              <ol className="relative space-y-5 border-l-2 border-slate-200 pl-5">
                {recentUsers.map((u) => (
                  <li key={u.id} className="relative">
                    <span className="absolute top-1.5 -left-[1.4rem] size-2.5 rounded-full bg-green-500 ring-2 ring-white" />
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-900">{u.name}</p>
                      <RoleBadge role={u.role} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Joined {u.createdAt.toLocaleDateString("en", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
