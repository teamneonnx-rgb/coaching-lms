"use client";

import { useState } from "react";
import { Menu, GraduationCap } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { TeacherSidebar } from "@/components/teacher/teacher-sidebar";

export function TeacherTopbar({
  user,
}: {
  user: { name?: string | null; email?: string | null };
}) {
  const [open, setOpen] = useState(false);

  return (
    <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Open menu">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 border-0 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <TeacherSidebar user={user} onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
      <div className="flex items-center gap-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-teal-600 text-white">
          <GraduationCap className="size-4" />
        </span>
        <span className="text-sm font-semibold text-slate-900">Coaching LMS</span>
      </div>
    </header>
  );
}
