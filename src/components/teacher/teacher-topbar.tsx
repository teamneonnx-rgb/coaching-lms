"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TeacherSidebar } from "@/components/teacher/teacher-sidebar";
import { NotificationBell } from "@/components/admin/notification-bell";
import { HeaderSearch } from "@/components/header-search";
import { BrandMark, type Brand } from "@/components/brand-mark";

export function TeacherTopbar({
  user,
  brand,
}: {
  user: { name?: string | null; email?: string | null };
  brand: Brand;
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
      <div className="flex items-center gap-3">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="lg:hidden" aria-label="Open menu">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 border-0 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <TeacherSidebar user={user} brand={brand} onNavigate={() => setOpen(false)} />
          </SheetContent>
        </Sheet>
        <div className="lg:hidden">
          <BrandMark brand={brand} size="sm" nameClassName="text-sm font-semibold text-slate-900" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <HeaderSearch action="/teacher/search" placeholder="Search students, batches…" />
        <NotificationBell />
      </div>
    </header>
  );
}
