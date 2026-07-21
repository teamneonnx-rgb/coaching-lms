"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type Result = { ok: boolean; error?: string };

// Reusable confirm-and-delete dialog. `onConfirm` runs a server action.
export function ConfirmDeleteDialog({
  title,
  description,
  onConfirm,
  trigger,
}: {
  title: string;
  description: string;
  onConfirm: () => Promise<Result>;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleConfirm() {
    startTransition(async () => {
      const result = await onConfirm();
      if (result.ok) {
        toast.success("Deleted");
        setOpen(false);
      } else {
        toast.error(result.error ?? "Failed to delete");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="ghost" size="icon-sm" aria-label="Delete">
            <Trash2 className="size-4 text-destructive" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
          <Button
            className="bg-destructive text-white hover:bg-destructive/90"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
