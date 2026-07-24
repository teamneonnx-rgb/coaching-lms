import type { Metadata } from "next";
import Link from "next/link";
import {
  GraduationCap,
  Presentation,
  Layers,
  BookOpen,
  IndianRupee,
  CalendarCheck,
  BadgeCheck,
  Inbox,
  ChevronRight,
  UserPlus,
  ShieldCheck,
  Activity,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { db } from "@/lib/db";
import { requireAdminArea } from "@/lib/session";
import { getCapabilitySet } from "@/lib/capabilities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import {
  EnrollmentChart,
  type ChartPoint,
} from "@/components/admin/dashboard/enrollment-chart";
import { RoleBadge } from "@/components/admin/role-badge";

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

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

const ENQUIRY_TINT: Record<string, string> = {
  NEW: "bg-blue-50 text-blue-600",
  CONTACTED: "bg-amber-50 text-amber-600",
  CONVERTED: "bg-green-50 text-green-600",
  LOST: "bg-slate-100 text-slate-500",
};

type Metric = { label: string; value: string; sub: string; icon: LucideIcon; tint: string };

export default async function AdminDashboard() {
  const user = await requireAdminArea();
  const caps = await getCapabilitySet(user);
  const can = (k: Parameters<typeof caps.has>[0]) => caps.has(k);
  const canPayment = can("PAYMENT_VIEW");
  const canEnquiry = can("ENQUIRY_VIEW");
  const canApprove = can("DOCUMENT_APPROVE");
  const canAttendance = can("STUDENT_ATTENDANCE_APPROVE") || can("TEACHER_ATTENDANCE");

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    studentCount,
    teacherCount,
    batchCount,
    courseCount,
    signupDates,
    recentUsers,
    collectedAgg,
    pendingAttendance,
    pendingContent,
    newEnquiries,
    overdueFees,
    recentEnquiries,
  ] = await Promise.all([
    db.user.count({ where: { role: "STUDENT", deletedAt: null } }),
    db.user.count({ where: { role: "TEACHER", deletedAt: null } }),
    db.batch.count({ where: { deletedAt: null } }),
    db.course.count({ where: { deletedAt: null } }),
    db.user.findMany({ where: { deletedAt: null }, select: { createdAt: true } }),
    db.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, role: true, createdAt: true },
    }),
    db.payment.aggregate({ _sum: { amountPaid: true }, where: { paidOn: { gte: startOfMonth } } }),
    db.attendance.count({ where: { approvalStatus: "PENDING" } }),
    db.resource.count({ where: { approvalStatus: "PENDING" } }),
    db.enquiry.count({ where: { status: "NEW" } }),
    db.payment.count({ where: { status: "OVERDUE" } }),
    db.enquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, interestedCourse: true, status: true, createdAt: true },
    }),
  ]);

  const totalUsers = studentCount + teacherCount;
  const series = buildMonthlySeries(signupDates.map((u) => u.createdAt));
  const collected = collectedAgg._sum.amountPaid ?? 0;
  const firstName = (user.name ?? "there").split(" ")[0];

  const metrics: Metric[] = [
    { label: "Students", value: String(studentCount), sub: "enrolled", icon: GraduationCap, tint: "bg-blue-50 text-blue-600" },
    { label: "Teachers", value: String(teacherCount), sub: "on staff", icon: Presentation, tint: "bg-teal-50 text-teal-600" },
    { label: "Active batches", value: String(batchCount), sub: `${courseCount} courses`, icon: Layers, tint: "bg-amber-50 text-amber-600" },
    canPayment
      ? { label: "Collected this month", value: inr(collected), sub: now.toLocaleString("en", { month: "long" }), icon: IndianRupee, tint: "bg-violet-50 text-violet-600" }
      : { label: "Courses", value: String(courseCount), sub: "published", icon: BookOpen, tint: "bg-violet-50 text-violet-600" },
  ];

  const attention = [
    { label: "Pending attendance approvals", count: pendingAttendance, href: "/admin/attendance", icon: CalendarCheck, show: canAttendance },
    { label: "Content awaiting approval", count: pendingContent, href: "/admin/approvals", icon: BadgeCheck, show: canApprove },
    { label: "New enquiries", count: newEnquiries, href: "/admin/enquiries", icon: Inbox, show: canEnquiry },
    { label: "Overdue fees", count: overdueFees, href: "/admin/payments", icon: IndianRupee, show: canPayment },
  ].filter((a) => a.show);
  const openItems = attention.reduce((n, a) => n + a.count, 0);

  return (
    <div className="space-y-6">
      {/* Greeting banner */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 p-6 text-white sm:p-8">
        <div className="pointer-events-none absolute -right-8 -top-10 size-40 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-16 right-24 size-40 rounded-full bg-white/5" />
        <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-medium text-blue-100">{greeting(now.getHours())}, {firstName} 👋</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
              {now.toLocaleDateString("en", { weekday: "long", day: "numeric", month: "long" })}
            </h1>
            <p className="mt-2 text-sm text-blue-100">
              {totalUsers} people · {batchCount} active {batchCount === 1 ? "batch" : "batches"}
              {openItems > 0 ? ` · ${openItems} item${openItems === 1 ? " needs" : "s need"} attention` : " · all caught up"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(can("TEACHER_MANAGE") || can("STUDENT_MANAGE")) && (
              <Link
                href="/admin/users"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3.5 py-2 text-sm font-medium text-blue-700 shadow-sm transition-colors hover:bg-blue-50"
              >
                <UserPlus className="size-4" /> Manage users
              </Link>
            )}
            {canApprove && (
              <Link
                href="/admin/approvals"
                className="inline-flex items-center gap-2 rounded-lg bg-blue-500/40 px-3.5 py-2 text-sm font-medium text-white ring-1 ring-inset ring-white/30 backdrop-blur transition-colors hover:bg-blue-500/60"
              >
                <ShieldCheck className="size-4" /> Review approvals
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {metrics.map((m) => (
          <Card key={m.label} className="border-slate-200 transition-shadow hover:shadow-md">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <span className={`flex size-10 items-center justify-center rounded-lg ${m.tint}`}>
                  <m.icon className="size-5" />
                </span>
              </div>
              <p className="mt-3 text-2xl font-semibold text-slate-900">{m.value}</p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-slate-600">{m.label}</span> · {m.sub}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart + needs-attention */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-slate-200 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Enrollment growth</CardTitle>
          </CardHeader>
          <CardContent>
            <EnrollmentChart data={series} />
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Needs attention</CardTitle>
            {openItems > 0 && (
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-600">{openItems}</span>
            )}
          </CardHeader>
          <CardContent>
            {attention.length === 0 ? (
              <EmptyState icon={Sparkles} title="Nothing assigned to you" description="Action items appear here as you're granted access." />
            ) : (
              <ul className="space-y-1">
                {attention.map((a) => (
                  <li key={a.label}>
                    <Link
                      href={a.href}
                      className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-slate-50"
                    >
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
      </div>

      {/* Recent enrollments + enquiries */}
      <div className={`grid gap-4 ${canEnquiry ? "lg:grid-cols-2" : ""}`}>
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Recent enrollments</CardTitle>
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

        {canEnquiry && (
          <Card className="border-slate-200">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent enquiries</CardTitle>
              <Link href="/admin/enquiries" className="text-xs font-medium text-blue-600 hover:underline">View all</Link>
            </CardHeader>
            <CardContent className="p-0">
              {recentEnquiries.length === 0 ? (
                <div className="p-6">
                  <EmptyState icon={Inbox} title="No enquiries yet" />
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {recentEnquiries.map((e) => (
                    <li key={e.id} className="flex items-center justify-between gap-3 px-6 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-slate-900">{e.name}</p>
                        <p className="truncate text-xs text-muted-foreground">{e.interestedCourse ?? "General enquiry"}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${ENQUIRY_TINT[e.status] ?? "bg-slate-100 text-slate-500"}`}>
                        {e.status.toLowerCase()}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
