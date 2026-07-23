"use client";

import { useTransition } from "react";
import { Pencil, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { deleteUser } from "@/lib/actions/admin/users";
import { startImpersonation } from "@/lib/actions/admin/impersonate";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import { UserFormDialog, type EditableUser } from "@/components/admin/users/user-form-dialog";

export function UserRowActions({ user, canImpersonate }: { user: EditableUser; canImpersonate?: boolean }) {
  const [isPending, start] = useTransition();

  function impersonate() {
    start(async () => {
      // On success this redirects; only errors return here.
      const r = await startImpersonation(user.id);
      if (r && !r.ok) toast.error(r.error ?? "Cannot impersonate");
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      {canImpersonate && user.role !== "SUPER_ADMIN" ? (
        <Button variant="ghost" size="icon-sm" aria-label="View as user" onClick={impersonate} disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />}
        </Button>
      ) : null}
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
