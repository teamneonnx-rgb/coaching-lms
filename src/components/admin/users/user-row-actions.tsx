"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteUser } from "@/lib/actions/admin/users";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { UserFormDialog, type EditableUser } from "@/components/admin/users/user-form-dialog";

export function UserRowActions({ user }: { user: EditableUser }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <UserFormDialog
        user={user}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label="Edit user">
            <Pencil className="size-4" />
          </Button>
        }
      />
      <ConfirmDeleteDialog
        title="Delete user"
        description={`Permanently delete ${user.name}? This cannot be undone.`}
        onConfirm={() => deleteUser(user.id)}
      />
    </div>
  );
}
