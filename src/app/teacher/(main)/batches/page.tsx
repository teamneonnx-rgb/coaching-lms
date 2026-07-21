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
import { BatchFormDialog } from "@/components/admin/batches/batch-form-dialog";

export const metadata: Metadata = { title: "Batches" };

export default async function TeacherBatchesPage() {
  await requireRole("TEACHER");
  const batches = await db.batch.findMany({
    orderBy: { startDate: "desc" },
    include: { _count: { select: { enrollments: true, courses: true } } },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Batches</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a batch, then add your courses to it.
          </p>
        </div>
        <BatchFormDialog />
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">All batches ({batches.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <EmptyState icon={Layers} title="No batches yet" description="Create your first batch." />
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
                          {b.isActive ? "Active" : "Inactive"}
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
