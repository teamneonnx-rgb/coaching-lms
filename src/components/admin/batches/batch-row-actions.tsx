"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteBatch } from "@/lib/actions/admin/batches";
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog";
import {
  BatchFormDialog,
  type EditableBatch,
} from "@/components/admin/batches/batch-form-dialog";

export function BatchRowActions({ batch }: { batch: EditableBatch }) {
  return (
    <div className="flex items-center justify-end gap-1">
      <BatchFormDialog
        batch={batch}
        trigger={
          <Button variant="ghost" size="icon-sm" aria-label="Edit batch">
            <Pencil className="size-4" />
          </Button>
        }
      />
      <ConfirmDeleteDialog
        title="Delete batch"
        description={`Delete "${batch.name}"? All its courses, chapters, resources, and enrollments will also be removed.`}
        onConfirm={() => deleteBatch(batch.id)}
      />
    </div>
  );
}
