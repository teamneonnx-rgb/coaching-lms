"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";
import { approveResource, rejectResource } from "@/lib/actions/admin/approvals";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ApprovalActions({ resourceId }: { resourceId: string }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");

  function run(fn: () => Promise<{ ok: boolean; error?: string; info?: string }>) {
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.info ?? "Done");
        router.refresh();
      } else {
        toast.error(r.error ?? "Failed");
      }
    });
  }

  if (rejecting) {
    // FR-AD-38: rejection requires a reason (shown to the uploading teacher).
    return (
      <div className="flex items-center gap-2">
        <Input
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Reason for rejection…"
          className="h-8 w-56 text-xs"
          autoFocus
        />
        <Button
          size="sm"
          variant="outline"
          disabled={isPending || reason.trim().length < 3}
          onClick={() => run(() => rejectResource(resourceId, reason))}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />} Reject
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setRejecting(false)} disabled={isPending}>
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        onClick={() => run(() => approveResource(resourceId))}
        disabled={isPending}
        className="bg-green-600 text-white hover:bg-green-600/90"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Approve
      </Button>
      <Button size="sm" variant="outline" onClick={() => setRejecting(true)} disabled={isPending}>
        <X className="size-4" /> Reject
      </Button>
    </div>
  );
}
