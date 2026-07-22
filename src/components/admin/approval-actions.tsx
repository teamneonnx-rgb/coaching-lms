"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { approveResource, rejectResource } from "@/lib/actions/admin/approvals";
import { Button } from "@/components/ui/button";

export function ApprovalActions({ resourceId }: { resourceId: string }) {
  const router = useRouter();
  const [isPending, start] = useTransition();

  function run(fn: (id: string) => Promise<{ ok: boolean; error?: string; info?: string }>) {
    start(async () => {
      const r = await fn(resourceId);
      if (r.ok) {
        toast.success(r.info ?? "Done");
        router.refresh();
      } else {
        toast.error(r.error ?? "Failed");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        onClick={() => run(approveResource)}
        disabled={isPending}
        className="bg-green-600 text-white hover:bg-green-600/90"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Approve
      </Button>
      <Button size="sm" variant="outline" onClick={() => run(rejectResource)} disabled={isPending}>
        <X className="size-4" /> Reject
      </Button>
    </div>
  );
}
