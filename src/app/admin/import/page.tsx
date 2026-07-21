import type { Metadata } from "next";
import { requireAdminArea } from "@/lib/session";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/admin/page-header";
import { BulkImportForm } from "@/components/admin/bulk-import-form";

export const metadata: Metadata = { title: "Bulk import" };

export default async function AdminImportPage() {
  await requireAdminArea();
  const batches = await db.batch.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Bulk import students"
        description="Create student accounts from CSV and optionally enrol them into a batch."
      />
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Import</CardTitle>
        </CardHeader>
        <CardContent>
          <BulkImportForm batches={batches} />
        </CardContent>
      </Card>
    </div>
  );
}
