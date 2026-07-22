import type { Metadata } from "next";
import { Layers, Users } from "lucide-react";
import { requireRole } from "@/lib/session";
import { getTeacherClassReport } from "@/lib/reports";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Reports" };

const dash = (v: number | null) => (v === null ? "—" : `${v}%`);

export default async function TeacherReportsPage() {
  const teacher = await requireRole("TEACHER");
  const batches = await getTeacherClassReport(teacher.id);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">Class performance across your batches (FR-RPT).</p>
      </div>

      {batches.length === 0 ? (
        <EmptyState icon={Layers} title="No batches yet" description="You aren't teaching any batch courses yet." />
      ) : (
        <div className="space-y-6">
          {batches.map((b) => (
            <Card key={b.id} className="border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Layers className="size-4 text-slate-400" /> {b.name}
                  <span className="ml-1 text-xs font-normal text-muted-foreground">· {b.students.length} students</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {b.students.length === 0 ? (
                  <EmptyState icon={Users} title="No students enrolled" />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Student</TableHead>
                          <TableHead className="text-right">Attendance</TableHead>
                          <TableHead className="text-right">Avg assessment</TableHead>
                          <TableHead className="text-right">Avg assignment</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {b.students.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell>
                              <p className="font-medium text-slate-900">{s.name}</p>
                              <p className="text-xs text-muted-foreground">{s.email}</p>
                            </TableCell>
                            <TableCell className="text-right text-slate-600">{dash(s.attendancePct)}</TableCell>
                            <TableCell className="text-right text-slate-600">{dash(s.assessmentAvg)}</TableCell>
                            <TableCell className="text-right text-slate-600">{dash(s.assignmentAvg)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
