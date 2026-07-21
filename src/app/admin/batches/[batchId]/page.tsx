import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAdminArea } from "@/lib/session";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EnrollmentManager } from "@/components/admin/enrollment-manager";

export const metadata: Metadata = { title: "Batch" };

export default async function AdminBatchDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  await requireAdminArea();
  const { batchId } = await params;

  const batch = await db.batch.findUnique({
    where: { id: batchId },
    include: {
      enrollments: {
        where: { isActive: true },
        include: { student: { select: { id: true, name: true, email: true } } },
        orderBy: { student: { name: "asc" } },
      },
    },
  });
  if (!batch) notFound();

  const enrolledIds = batch.enrollments.map((e) => e.student.id);
  // Students not actively enrolled in this batch (candidates to add).
  const available = await db.user.findMany({
    where: { role: "STUDENT", deletedAt: null, id: { notIn: enrolledIds.length ? enrolledIds : ["_none_"] } },
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/admin/batches"
        className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-slate-900"
      >
        <ArrowLeft className="size-4" /> Back to batches
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">{batch.name}</h1>
        {batch.description ? (
          <p className="mt-1 text-sm text-muted-foreground">{batch.description}</p>
        ) : null}
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Enrollment</CardTitle>
        </CardHeader>
        <CardContent>
          <EnrollmentManager
            batchId={batch.id}
            enrolled={batch.enrollments.map((e) => e.student)}
            available={available}
          />
        </CardContent>
      </Card>
    </div>
  );
}
