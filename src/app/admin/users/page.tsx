import type { Metadata } from "next";
import { Users as UsersIcon } from "lucide-react";
import { db } from "@/lib/db";
import { requireAdminArea } from "@/lib/session";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { UserFormDialog } from "@/components/admin/users/user-form-dialog";
import { UserRowActions } from "@/components/admin/users/user-row-actions";

export const metadata: Metadata = { title: "Users" };

export default async function AdminUsersPage() {
  const me = await requireAdminArea();
  const canImpersonate = me.role === "SUPER_ADMIN";
  const users = await db.user.findMany({
    where: { deletedAt: null },
    orderBy: [{ role: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      parentName: true,
      parentPhone: true,
      parentEmail: true,
      createdAt: true,
    },
  });

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage admins, teachers, and students."
        action={<UserFormDialog />}
      />

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base">All users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <EmptyState
              icon={UsersIcon}
              title="No users yet"
              description="Add your first admin, teacher, or student to get started."
              action={<UserFormDialog />}
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Parent contact</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium text-slate-900">{u.name}</TableCell>
                      <TableCell className="text-slate-600">{u.email}</TableCell>
                      <TableCell>
                        <RoleBadge role={u.role} />
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {u.role === "STUDENT" && (u.parentPhone || u.parentEmail) ? (
                          <span className="text-sm">
                            {u.parentPhone ?? u.parentEmail}
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <UserRowActions
                          user={{
                            id: u.id,
                            name: u.name,
                            email: u.email,
                            role: u.role,
                            parentName: u.parentName,
                            parentPhone: u.parentPhone,
                            parentEmail: u.parentEmail,
                          }}
                          canImpersonate={canImpersonate}
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
