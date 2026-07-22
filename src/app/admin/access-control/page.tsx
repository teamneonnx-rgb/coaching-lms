import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { requireAdminArea } from "@/lib/session";
import { isFullAdmin } from "@/lib/roles";
import { getAccessPolicy } from "@/lib/access-policy";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { AccessControlEditor } from "@/components/admin/access-control-editor";

export const metadata: Metadata = { title: "Access Control" };

// Roles in matrix column order.
const ROLES = ["SUPER_ADMIN", "ADMIN", "IT", "TEACHER", "STUDENT", "PARENT"] as const;
const ROLE_LABEL: Record<(typeof ROLES)[number], string> = {
  SUPER_ADMIN: "Super Admin", ADMIN: "Admin", IT: "IT", TEACHER: "Teacher", STUDENT: "Student", PARENT: "Parent",
};

// Capability × role matrix — reflects the permissions actually enforced by the
// middleware and server-action guards (FR-ACL, FR-RBAC).
type Row = { capability: string } & Record<(typeof ROLES)[number], boolean>;
const b = (...roles: (typeof ROLES)[number][]) =>
  Object.fromEntries(ROLES.map((r) => [r, roles.includes(r)])) as Record<(typeof ROLES)[number], boolean>;

const MATRIX: Row[] = [
  { capability: "Manage users", ...b("SUPER_ADMIN", "ADMIN", "IT") },
  { capability: "Delete / restore records", ...b("SUPER_ADMIN", "ADMIN") },
  { capability: "Create courses & batches", ...b("SUPER_ADMIN", "ADMIN", "IT") },
  { capability: "Approve content", ...b("SUPER_ADMIN", "ADMIN") },
  { capability: "Configure integrations & policies", ...b("SUPER_ADMIN", "ADMIN") },
  { capability: "Add course content", ...b("SUPER_ADMIN", "ADMIN", "IT", "TEACHER") },
  { capability: "Create assessments & assignments", ...b("TEACHER") },
  { capability: "Grade submissions", ...b("TEACHER") },
  { capability: "Answer doubts", ...b("SUPER_ADMIN", "ADMIN", "TEACHER", "STUDENT") },
  { capability: "View institute reports", ...b("SUPER_ADMIN", "ADMIN", "IT") },
  { capability: "Study content & submit work", ...b("STUDENT") },
  { capability: "Ask doubts & give feedback", ...b("STUDENT") },
  { capability: "View child's progress", ...b("PARENT") },
];

export default async function AccessControlPage() {
  const user = await requireAdminArea();
  const canEdit = isFullAdmin(user.role);
  const policy = await getAccessPolicy();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-slate-900">Access Control</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Role permissions and institute-wide access policies (FR-ACL).
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Permission matrix</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-52">Capability</TableHead>
                    {ROLES.map((r) => (
                      <TableHead key={r} className="text-center">{ROLE_LABEL[r]}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {MATRIX.map((row) => (
                    <TableRow key={row.capability}>
                      <TableCell className="font-medium text-slate-900">{row.capability}</TableCell>
                      {ROLES.map((r) => (
                        <TableCell key={r} className="text-center">
                          {row[r] ? (
                            <Check className="mx-auto size-4 text-green-600" />
                          ) : (
                            <Minus className="mx-auto size-4 text-slate-300" />
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              This matrix documents the permissions enforced server-side. Toggling the policies on the
              right changes behaviour for everyone in the institute.
            </p>
          </CardContent>
        </Card>

        <AccessControlEditor policy={policy} canEdit={canEdit} />
      </div>
    </div>
  );
}
