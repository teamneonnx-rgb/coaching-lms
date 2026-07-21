import type { Metadata } from "next";
import Link from "next/link";
import { Layers } from "lucide-react";
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
import { PageHeader } from "@/components/admin/page-header";
import { EmptyState } from "@/components/empty-state";
import { BatchFormDialog } from "@/components/admin/batches/batch-form-dialog";
import { BatchRowActions } from "@/components/admin/batches/batch-row-actions";

export const metadata: Metadata = { title: "Batches" };

function toDateInput(d: Date | null): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

export default async function AdminBatchesPage() {
  const batches = await db.batch.findMany({
    orderBy: { startDate: "desc" },
    include: {
      _count: { select: { enrollments: true, courses: true } },
    },
  });

  return (
    <div>
      <PageHeader
        title="Batches"
        description="Group students and organise their courses."
        action={<BatchFormDialog />}
      />

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">All batches ({batches.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {batches.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No batches yet"
              description="Create a batch to start enrolling students and adding courses."
              action={<BatchFormDialog />}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Students</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="font-medium text-slate-900">
                        <Link href={`/admin/batches/${b.id}`} className="hover:text-blue-600 hover:underline">
                          {b.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {b.startDate.toISOString().slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {b.endDate ? b.endDate.toISOString().slice(0, 10) : "—"}
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
                      <TableCell className="text-right">
                        <BatchRowActions
                          batch={{
                            id: b.id,
                            name: b.name,
                            description: b.description,
                            startDate: b.startDate.toISOString().slice(0, 10),
                            endDate: toDateInput(b.endDate),
                            isActive: b.isActive,
                          }}
                        />
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
