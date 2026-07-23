"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { resetPasswordWithToken } from "@/lib/actions/password-reset";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ResetPasswordForm({ uid, token }: { uid: string; token: string }) {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [isPending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pw !== confirm) { toast.error("Passwords don't match"); return; }
    start(async () => {
      const r = await resetPasswordWithToken({ uid, token, newPassword: pw });
      if (r.ok) {
        toast.success(r.info ?? "Password reset");
        router.push("/login");
      } else {
        toast.error(r.error ?? "Failed");
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-1.5">
        <Label>New password</Label>
        <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} required />
        <p className="text-xs text-muted-foreground">8–72 characters.</p>
      </div>
      <div className="grid gap-1.5">
        <Label>Confirm password</Label>
        <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
      </div>
      <Button type="submit" disabled={isPending || pw.length < 8} className="w-full">
        {isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        Set new password
      </Button>
    </form>
  );
}
