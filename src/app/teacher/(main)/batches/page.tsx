import type { Metadata } from "next";
import { Layers } from "lucide-react";
import { requireRole } from "@/lib/session";
import { db } from "@/lib/db";
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

export const metadata: Metadata = { title: "My Batches" };

// FR-TE-06: a teacher sees ONLY the batches assigned to them (scoped in the
// query). FR-TE-15 / FR-AD-10: teachers cannot create batches — the create
// dialog was removed; batches are provisioned by Admin.
export default async function TeacherBatchesPage() {
  const teacher = await requireRole("TEACHER");
  const batches = await db.batch.findMany({
    where: { deletedAt: null, courses: { some: { teacherId: teacher.id, deletedAt: null } } },
    orderBy: { startDate: "desc" },
    include: { _count: { select: { enrollments: { where: { isActive: true } }, courses: true } } },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">My Batches</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Batches assigned to you by the institute admin.
        </p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Assigned batches ({batches.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <EmptyState icon={Layers} title="No batches assigned" description="Your admin hasn't assigned you a batch yet." />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium text-slate-900">{b.name}</TableCell>
                      <TableCell className="text-slate-600">
                        {b.startDate.toISOString().slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-slate-600">{b._count.enrollments}</TableCell>
                      <TableCell className="text-slate-600">{b._count.courses}</TableCell>
                      <TableCell>
                        <span
                          className={
                            b.isActive
                              ? "inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                              : "inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                          }
                        >
                          {b.isActive ? "Active" : "Archived"}
                        </span>
                      </TableCell>
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
