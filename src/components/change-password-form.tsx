"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { changePasswordAction } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ChangePasswordForm({ forced }: { forced: boolean }) {
  const router = useRouter();
  const [isPending, start] = useTransition();
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });

  function submit() {
    if (form.next !== form.confirm) {
      toast.error("Passwords don't match");
      return;
    }
    start(async () => {
      const r = await changePasswordAction({ currentPassword: form.current, newPassword: form.next });
      if (r.ok) {
        toast.success("Password updated");
        router.push("/dashboard");
        router.refresh();
      } else {
        toast.error(r.error ?? "Failed");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-1.5">
        <Label>{forced ? "Temporary password" : "Current password"}</Label>
        <Input type="password" value={form.current} onChange={(e) => setForm((f) => ({ ...f, current: e.target.value }))} />
      </div>
      <div className="grid gap-1.5">
        <Label>New password</Label>
        <Input type="password" value={form.next} onChange={(e) => setForm((f) => ({ ...f, next: e.target.value }))} />
        <p className="text-xs text-muted-foreground">8–72 characters.</p>
      </div>
      <div className="grid gap-1.5">
        <Label>Confirm new password</Label>
        <Input type="password" value={form.confirm} onChange={(e) => setForm((f) => ({ ...f, confirm: e.target.value }))} />
      </div>
      <Button
        onClick={submit}
        disabled={isPending || form.current.length === 0 || form.next.length < 8}
        className="w-full bg-blue-600 text-white hover:bg-blue-600/90"
      >
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        Set password
      </Button>
    </div>
  );
}
