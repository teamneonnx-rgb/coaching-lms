import type { Metadata } from "next";
import { Trash2 } from "lucide-react";
import { requireAdminArea } from "@/lib/session";
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
import { RoleBadge } from "@/components/admin/role-badge";
import { EmptyState } from "@/components/empty-state";
import { RestoreUserButton } from "@/components/admin/restore-button";

export const metadata: Metadata = { title: "Recycle bin" };

export default async function RecycleBinPage() {
  await requireAdminArea();
  const deleted = await db.user.findMany({
    where: { deletedAt: { not: null } },
    orderBy: { deletedAt: "desc" },
    select: { id: true, name: true, email: true, role: true, deletedAt: true },
  });

  return (
    <div>
      <PageHeader
        title="Recycle bin"
        description="Soft-deleted accounts. Restore returns full access (FR-ADM-3)."
      />
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">Deleted users ({deleted.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {deleted.length === 0 ? (
            <EmptyState icon={Trash2} title="Recycle bin is empty" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Deleted</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deleted.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium text-slate-900">{u.name}</TableCell>
                      <TableCell className="text-slate-600">{u.email}</TableCell>
                      <TableCell>
                        <RoleBadge role={u.role} />
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {u.deletedAt?.toISOString().slice(0, 10)}
                      </TableCell>
                      <TableCell className="text-right">
                        <RestoreUserButton id={u.id} />
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
