"use client";

import { useTransition } from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { markResourceComplete, markResourceIncomplete } from "@/lib/actions/student";
import { Button } from "@/components/ui/button";

export function MarkCompleteButton({
  resourceId,
  completed,
}: {
  resourceId: string;
  completed: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const result = completed
        ? await markResourceIncomplete({ resourceId })
        : await markResourceComplete({ resourceId });
      if (result.ok) {
        toast.success(completed ? "Marked as not done" : "Marked as complete");
      } else {
        toast.error(result.error ?? "Something went wrong");
      }
    });
  }

  return (
    <Button
      type="button"
      onClick={toggle}
      disabled={isPending}
      className={
        completed
          ? "bg-green-600 text-white hover:bg-green-600/90"
          : "bg-orange-500 text-white hover:bg-orange-500/90"
      }
    >
      {isPending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : completed ? (
        <CheckCircle2 className="size-4" />
      ) : (
        <Circle className="size-4" />
      )}
      {completed ? "Completed" : "Mark as complete"}
    </Button>
  );
}
