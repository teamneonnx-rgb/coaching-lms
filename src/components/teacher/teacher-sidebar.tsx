"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  LayoutDashboard,
  CalendarCheck,
  ClipboardList,
  BookOpen,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/logout-button";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV: NavItem[] = [
  { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teacher/batches", label: "Batches", icon: Layers },
  { href: "/teacher/content", label: "Content", icon: BookOpen },
  { href: "/teacher/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/teacher/assessments", label: "Assessments", icon: ClipboardList },
];

export function TeacherSidebar({
  user,
  onNavigate,
}: {
  user: { name?: string | null; email?: string | null };
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r border-slate-200 bg-slate-800 text-slate-100">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-teal-600 text-white">
          <GraduationCap className="size-5" />
        </span>
        <span className="text-sm font-semibold tracking-tight">Coaching LMS</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/teacher" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-teal-600 text-white"
                  : "text-slate-300 hover:bg-slate-700 hover:text-white"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-700 p-4">
        <div className="mb-3 min-w-0">
          <p className="truncate text-sm font-medium text-slate-100">{user.name}</p>
          <p className="truncate text-xs text-slate-400">{user.email}</p>
        </div>
        <LogoutButton className="w-full border-slate-600 bg-slate-700 text-slate-100 hover:bg-slate-600 hover:text-white" />
      </div>
    </div>
  );
}
