import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { requireAdminArea } from "@/lib/session";
import { hasCapability } from "@/lib/capabilities";
import { db } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/empty-state";

export const metadata: Metadata = { title: "Teachers" };

// FR-AD-05: teacher list — name, photo, subject, batch count, active status.
// Entry point of the drill-down spine: Teachers → Teacher → Batch → Student.
export default async function AdminTeachersPage() {
  const user = await requireAdminArea();
  if (!(await hasCapability(user, "TEACHER_VIEW"))) redirect("/admin");

  const teachers = await db.user.findMany({
    where: { role: "TEACHER", deletedAt: null },
    orderBy: { name: "asc" },
    select: {
      id: true, name: true, email: true, status: true,
      subjectSpecialisation: true, photoUrl: true,
      _count: { select: { ownedBatches: { where: { deletedAt: null } }, courses: { where: { deletedAt: null } } } },
    },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Teachers</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Drill down: Teachers → Teacher → Batch → Student.
        </p>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">All teachers ({teachers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {teachers.length === 0 ? (
            <EmptyState icon={GraduationCap} title="No teachers yet" />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-right">Batches</TableHead>
                    <TableHead className="text-right">Courses</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teachers.map((t) => (
                    <TableRow key={t.id}>
                      <TableCell>
                        <Link href={`/admin/teachers/${t.id}`} className="flex items-center gap-3 hover:underline">
                          <span className="flex size-9 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
                            {(t.name ?? "?").slice(0, 1)}
                          </span>
                          <span>
                            <span className="block font-medium text-slate-900">{t.name}</span>
                            <span className="block text-xs text-muted-foreground">{t.email}</span>
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-slate-600">{t.subjectSpecialisation ?? "—"}</TableCell>
                      <TableCell className="text-right text-slate-600">{t._count.ownedBatches}</TableCell>
                      <TableCell className="text-right text-slate-600">{t._count.courses}</TableCell>
                      <TableCell>
                        <span className={t.status === "ACTIVE"
                          ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700"
                          : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"}>
                          {t.status === "ACTIVE" ? "Active" : "Suspended"}
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
