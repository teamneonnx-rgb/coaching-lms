import { GraduationCap } from "lucide-react";
import { requireRole } from "@/lib/session";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBell } from "@/components/admin/notification-bell";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("PARENT");

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-lg bg-pink-500 text-white">
            <GraduationCap className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">Parent Portal</p>
            <p className="text-xs text-muted-foreground">{user.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 p-4 lg:p-8">{children}</main>
    </div>
  );
}
