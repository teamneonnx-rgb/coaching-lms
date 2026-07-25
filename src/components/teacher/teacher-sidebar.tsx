"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarCheck,
  ClipboardList,
  FileText,
  MessagesSquare,
  ClipboardCheck,
  BarChart3,
  BookOpen,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/logout-button";
import { BrandMark, type Brand } from "@/components/brand-mark";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV: NavItem[] = [
  { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teacher/batches", label: "Batches", icon: Layers },
  { href: "/teacher/content", label: "Content", icon: BookOpen },
  { href: "/teacher/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/teacher/assessments", label: "Assessments", icon: ClipboardList },
  { href: "/teacher/assignments", label: "Assignments", icon: FileText },
  { href: "/teacher/doubts", label: "Doubts", icon: MessagesSquare },
  { href: "/teacher/evaluations", label: "Evaluations", icon: ClipboardCheck },
  { href: "/teacher/reports", label: "Reports", icon: BarChart3 },
];

export function TeacherSidebar({
  user,
  brand,
  onNavigate,
}: {
  user: { name?: string | null; email?: string | null };
  brand: Brand;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r border-slate-200 bg-slate-800 text-slate-100">
      <div className="px-5 py-5">
        <BrandMark brand={brand} size="md" />
      </div>

      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-3">
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
