"use client";

import { useState } from "react";
import { Menu, GraduationCap } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { NotificationBell } from "@/components/admin/notification-bell";

// Sticky top bar for the admin shell: mobile hamburger (Sheet) + brand on the
// left, the SWR-polling notification bell on the right (all sizes).
export function AdminHeader({
  user,
}: {
  user: { name?: string | null; email?: string | null };
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 border-0 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <AdminSidebar user={user} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 lg:hidden">
          <span className="flex size-7 items-center justify-center rounded-md bg-blue-600 text-white">
            <GraduationCap className="size-4" />
          </span>
          <span className="text-sm font-semibold text-slate-900">Coaching LMS</span>
        </div>
      </div>

      <NotificationBell />
    </header>
  );
}
