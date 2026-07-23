import type { Metadata } from "next";
import { KeyRound } from "lucide-react";
import { requireUser } from "@/lib/session";
import { db } from "@/lib/db";
import { ChangePasswordForm } from "@/components/change-password-form";

export const metadata: Metadata = { title: "Change password" };

// FR-AU-02 — forced rotation screen for admin-created accounts, and general
// self-service password change. Lives outside the role shells so the shells
// can redirect here without looping.
export default async function ChangePasswordPage() {
  const user = await requireUser();
  const row = await db.user.findUnique({
    where: { id: user.id },
    select: { mustChangePassword: true },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-lg bg-blue-600 text-white">
            <KeyRound className="size-5" />
          </span>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              {row?.mustChangePassword ? "Set a new password" : "Change password"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {row?.mustChangePassword
                ? "Your account was created with a temporary password. Choose your own to continue."
                : "Update your account password."}
            </p>
          </div>
        </div>
        <ChangePasswordForm forced={!!row?.mustChangePassword} />
      </div>
    </div>
  );
}
