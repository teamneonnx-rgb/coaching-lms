"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { deletePage } from "@/lib/actions/admin/pages";
import { Button } from "@/components/ui/button";

export function DeletePageButton({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <Button
      variant="ghost"
      size="icon"
      title="Delete page"
      aria-label={`Delete ${name}`}
      disabled={pending}
      className="text-slate-400 hover:text-red-600"
      onClick={() => {
        if (!confirm(`Delete "${name}"? This can't be undone from here.`)) return;
        start(async () => {
          const r = await deletePage(id);
          if (r.ok) {
            toast.success("Page deleted");
            router.refresh();
          } else {
            toast.error(r.error ?? "Could not delete");
          }
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
    </Button>
  );
}
