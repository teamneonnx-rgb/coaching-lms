import type { Metadata } from "next";
import {
  Users, GraduationCap, Layers, BookOpen, CalendarCheck, ClipboardList,
  FileText, Star, MessagesSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { requireAdminArea } from "@/lib/session";
import { getInstituteReport } from "@/lib/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Reports" };

function Stat({ icon: Icon, label, value, hint }: { icon: LucideIcon; label: string; value: string; hint?: string }) {
  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <Icon className="size-5" />
          </span>
          <div>
            <p className="text-xl font-semibold text-slate-900">{value}</p>
            <p className="text-xs text-muted-foreground">{label}{hint ? ` · ${hint}` : ""}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

const dash = (v: number | null, suffix = "%") => (v === null ? "—" : `${v}${suffix}`);

export default async function AdminReportsPage() {
  await requireAdminArea();
  const { kpis, perBatch } = await getInstituteReport();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">Institute-wide performance overview (FR-RPT).</p>
      </div>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} label="Students" value={String(kpis.students)} />
        <Stat icon={GraduationCap} label="Teachers" value={String(kpis.teachers)} />
        <Stat icon={Layers} label="Batches" value={String(kpis.batches)} />
        <Stat icon={BookOpen} label="Courses" value={String(kpis.courses)} />
        <Stat icon={CalendarCheck} label="Attendance" value={dash(kpis.attendancePct)} />
        <Stat icon={ClipboardList} label="Avg assessment" value={dash(kpis.assessmentAvg)} />
        <Stat icon={FileText} label="Avg assignment" value={dash(kpis.assignmentAvg)} />
        <Stat icon={Star} label="Avg rating" value={kpis.feedbackAvg === null ? "—" : `${kpis.feedbackAvg}/5`} hint={`${kpis.feedbackCount}`} />
        <Stat icon={MessagesSquare} label="Doubts open" value={`${kpis.doubtsOpen}/${kpis.doubtsTotal}`} />
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">By batch ({perBatch.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {perBatch.length === 0 ? (
            <EmptyState icon={Layers} title="No batches yet" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Batch</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Students</TableHead>
                    <TableHead className="text-right">Attendance</TableHead>
                    <TableHead className="text-right">Avg assessment</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perBatch.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium text-slate-900">{b.name}</TableCell>
                      <TableCell>
                        {b.isActive ? (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Active</span>
                        ) : (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">Inactive</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right text-slate-600">{b.students}</TableCell>
                      <TableCell className="text-right text-slate-600">{dash(b.attendancePct)}</TableCell>
                      <TableCell className="text-right text-slate-600">{dash(b.assessmentAvg)}</TableCell>
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
