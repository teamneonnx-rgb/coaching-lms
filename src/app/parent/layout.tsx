import Link from "next/link";
import { GraduationCap, Search } from "lucide-react";
import { requireRole, enforcePasswordRotation } from "@/lib/session";
import { LogoutButton } from "@/components/logout-button";
import { NotificationBell } from "@/components/admin/notification-bell";

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole("PARENT");
  await enforcePasswordRotation(user.id); // FR-AU-02

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
          <Link href="/parent" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">Home</Link>
          <Link href="/parent/search" className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50">
            <Search className="size-4" /> Search
          </Link>
          <NotificationBell />
          <LogoutButton />
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 p-4 lg:p-8">{children}</main>
    </div>
  );
}
