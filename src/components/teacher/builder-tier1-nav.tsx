"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import {
  GraduationCap,
  LayoutDashboard,
  CalendarCheck,
  ClipboardList,
  LogOut,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { logoutAction } from "@/lib/actions/auth";

type Item = { href: string; label: string; icon: LucideIcon };

const ITEMS: Item[] = [
  { href: "/teacher", label: "Dashboard", icon: LayoutDashboard },
  { href: "/teacher/attendance", label: "Attendance", icon: CalendarCheck },
  { href: "/teacher/assessments", label: "Assessments", icon: ClipboardList },
];

// Tier 1 — global icon nav (w-16) for the assessment builder (UI spec).
export function BuilderTier1Nav() {
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  return (
    <nav className="flex h-screen w-16 shrink-0 flex-col items-center gap-2 bg-slate-800 py-4 text-slate-300">
      <span className="mb-2 flex size-9 items-center justify-center rounded-lg bg-teal-600 text-white">
        <GraduationCap className="size-5" />
      </span>
      {ITEMS.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/teacher/assessments"
            ? pathname.startsWith(href)
            : pathname === href;
        return (
          <Link
            key={href}
            href={href}
            title={label}
            aria-label={label}
            className={cn(
              "flex size-10 items-center justify-center rounded-lg transition-colors",
              active ? "bg-teal-600 text-white" : "hover:bg-slate-700 hover:text-white"
            )}
          >
            <Icon className="size-5" />
          </Link>
        );
      })}
      <button
        type="button"
        title="Sign out"
        aria-label="Sign out"
        disabled={isPending}
        onClick={() => startTransition(() => logoutAction())}
        className="mt-auto flex size-10 items-center justify-center rounded-lg hover:bg-slate-700 hover:text-white"
      >
        {isPending ? <Loader2 className="size-5 animate-spin" /> : <LogOut className="size-5" />}
      </button>
    </nav>
  );
}
