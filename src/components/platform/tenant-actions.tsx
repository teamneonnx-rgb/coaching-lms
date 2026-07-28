"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Ban, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setTenantActive } from "@/lib/actions/platform";
import { Button } from "@/components/ui/button";

export function TenantActions({ id, name, active }: { id: string; name: string; active: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function toggle() {
    if (active && !confirm(`Suspend "${name}"? Its users won't be able to sign in until you reactivate it.`)) return;
    start(async () => {
      const r = await setTenantActive(id, !active);
      if (r.ok) {
        toast.success(r.info ?? "Done");
        router.refresh();
      } else {
        toast.error(r.error ?? "Could not update tenant");
      }
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggle}
      disabled={pending}
      className={active ? "text-red-600 hover:text-red-700" : "text-green-600 hover:text-green-700"}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : active ? <Ban className="size-4" /> : <CheckCircle2 className="size-4" />}
      {active ? "Suspend" : "Reactivate"}
    </Button>
  );
}
