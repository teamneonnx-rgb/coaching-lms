"use client";

import { useTransition } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { restoreUser } from "@/lib/actions/admin/users";
import { Button } from "@/components/ui/button";

export function RestoreUserButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          const r = await restoreUser(id);
          if (r.ok) toast.success("Restored");
          else toast.error(r.error ?? "Failed");
        })
      }
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />}
      Restore
    </Button>
  );
}
