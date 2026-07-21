"use client";

import { useTransition } from "react";
import { LogOut, Loader2 } from "lucide-react";
import { logoutAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";

export function LogoutButton({ className }: { className?: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className={className}
      disabled={isPending}
      onClick={() => startTransition(() => logoutAction())}
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      Sign out
    </Button>
  );
}
