import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireAdminArea } from "@/lib/session";
import { hasCapability } from "@/lib/capabilities";
import { db } from "@/lib/db";
import { getActiveBatch } from "@/lib/student";
import { getStudentReport } from "@/lib/reports";
import { getStudentPayments, computeStatus } from "@/lib/payments";
import { formatDate } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Student" };

const dash = (v: number | null) => (v === null ? "—" : `${v}%`);

// FR-AD-08/09: student profile with attendance %, results and progress —
// reached via Teachers / {Teacher} / {Batch} / {Student}, breadcrumb retained.
export default async function AdminStudentProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ teacherId?: string; batchId?: string }>;
}) {
  const user = await requireAdminArea();
  if (!(await hasCapability(user, "TEACHER_VIEW")) && !(await hasCapability(user, "STUDENT_MANAGE"))) {
    redirect("/admin");
  }
  const { id } = await params;
  const sp = await searchParams;

  const student = await db.user.findFirst({
    where: { id, role: "STUDENT", deletedAt: null },
    select: {
      id: true, name: true, email: true, phone: true, status: true,
      enrolmentNo: true, classOrStandard: true, admissionDate: true,
      parentName: true, parentPhone: true, parentEmail: true,
    },
  });
  if (!student) notFound();

  // Breadcrumb context (best-effort from the drill-down trail).
  const [crumbTeacher, crumbBatch] = await Promise.all([
    sp.teacherId ? db.user.findUnique({ where: { id: sp.teacherId }, select: { id: true, name: true } }) : null,
    sp.batchId ? db.batch.findUnique({ where: { id: sp.batchId }, select: { id: true, name: true } }) : null,
  ]);

  const batch = crumbBatch ?? (await getActiveBatch(student.id));
  const report = batch ? await getStudentReport(student.id, batch.id) : null;

  // FR-AD-17: per-student fee record (Student payment detail screen).
  const canViewPayments = await hasCapability(user, "PAYMENT_VIEW");
  const fees = canViewPayments ? await getStudentPayments(student.id) : [];

  return (
    <div>
      <nav className="mb-4 text-sm text-muted-foreground">
        <Link href="/admin/teachers" className="hover:underline">Teachers</Link>
        {crumbTeacher ? (
          <>
            <span className="mx-1.5">/</span>
            <Link href={`/admin/teachers/${crumbTeacher.id}`} className="hover:underline">{crumbTeacher.name}</Link>
          </>
        ) : null}
        {crumbBatch ? (
          <>
            <span className="mx-1.5">/</span>
            <Link href={`/admin/batches/${crumbBatch.id}${crumbTeacher ? `?teacherId=${crumbTeacher.id}` : ""}`} className="hover:underline">
              {crumbBatch.name}
            </Link>
          </>
        ) : null}
        <span className="mx-1.5">/</span>
        <span className="text-slate-900">{student.name}</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{student.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {student.email}
          {student.enrolmentNo ? ` · Enrolment ${student.enrolmentNo}` : ""}
          {student.classOrStandard ? ` · ${student.classOrStandard}` : ""}
          {batch ? ` · ${batch.name}` : " · no active batch"}
        </p>
        {student.parentName || student.parentPhone ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Parent: {student.parentName ?? "—"} {student.parentPhone ? `· ${student.parentPhone}` : ""} {student.parentEmail ? `· ${student.parentEmail}` : ""}
          </p>
        ) : null}
      </div>

      {report ? (
        <>
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Attendance", value: dash(report.attendancePct), sub: `${report.attendanceMarked} approved day(s)` },
              { label: "Content done", value: dash(report.completionPct), sub: `${report.completed}/${report.totalResources}` },
              { label: "Avg assessment", value: dash(report.assessmentAvg), sub: "" },
              { label: "Avg assignment", value: dash(report.assignmentAvg), sub: "" },
            ].map((m) => (
              <Card key={m.label} className="border-slate-200">
                <CardContent className="p-4">
                  <p className="text-xl font-semibold text-slate-900">{m.value}</p>
                  <p className="text-xs text-muted-foreground">{m.label}{m.sub ? ` · ${m.sub}` : ""}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-slate-200">
              <CardHeader><CardTitle className="text-base">Assessment scores</CardTitle></CardHeader>
              <CardContent>
                {report.assessments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No graded assessments.</p>
                ) : (
                  <ul className="space-y-2">
                    {report.assessments.map((a, i) => (
                      <li key={i} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{a.title}</span>
                        <span className="font-medium text-slate-900">{a.score ?? "—"}{a.max ? `/${a.max}` : ""}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
            <Card className="border-slate-200">
              <CardHeader><CardTitle className="text-base">Assignment scores</CardTitle></CardHeader>
              <CardContent>
                {report.assignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No graded assignments.</p>
                ) : (
                  <ul className="space-y-2">
                    {report.assignments.map((a, i) => (
                      <li key={i} className="flex items-center justify-between text-sm">
                        <span className="text-slate-700">{a.title}</span>
                        <span className="font-medium text-slate-900">{a.score ?? "—"}/{a.max}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="border-slate-200">
          <CardContent className="p-6 text-sm text-muted-foreground">
            This student isn&apos;t enrolled in an active batch yet — no progress to report.
          </CardContent>
        </Card>
      )}

      {canViewPayments ? (
        <Card className="mt-6 border-slate-200">
          <CardHeader><CardTitle className="text-base">Fee record ({fees.length})</CardTitle></CardHeader>
          <CardContent>
            {fees.length === 0 ? (
              <p className="text-sm text-muted-foreground">No fee demands for this student.</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {fees.map((p) => {
                  const status = computeStatus(p);
                  return (
                    <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                      <span>
                        <span className="block font-medium text-slate-900">{p.title}</span>
                        <span className="block text-xs text-muted-foreground">
                          ₹{p.amountPaid}/{p.amountDue}
                          {p.dueDate ? ` · due ${formatDate(p.dueDate)}` : ""}
                          {p.receiptNo ? ` · receipt ${p.receiptNo}` : ""}
                          {p.mode ? ` · ${p.mode}` : ""}
                        </span>
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        status === "PAID" ? "bg-green-100 text-green-700"
                        : status === "OVERDUE" ? "bg-red-100 text-red-700"
                        : "bg-amber-100 text-amber-700"}`}>
                        {status}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
