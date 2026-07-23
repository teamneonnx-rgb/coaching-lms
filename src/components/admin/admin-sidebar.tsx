"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  Layers,
  BookOpen,
  Upload,
  Trash2,
  IndianRupee,
  Inbox,
  Award,
  BookOpenCheck,
  BarChart3,
  BadgeCheck,
  ShieldCheck,
  CalendarCheck,
  SlidersHorizontal,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/logout-button";
import type { CapabilityKey } from "@/lib/capabilities-shared";

// FR-PM-01: each item declares the capabilities that unlock it (any-of).
// `superAdminOnly` items never render for plain Admins or IT.
type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  needs?: CapabilityKey[];
  superAdminOnly?: boolean;
};

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/users", label: "Users", icon: Users, needs: ["TEACHER_MANAGE", "STUDENT_MANAGE", "PASSWORD_RESET"] },
  { href: "/admin/teachers", label: "Teachers", icon: GraduationCap, needs: ["TEACHER_VIEW"] },
  { href: "/admin/batches", label: "Batches", icon: Layers, needs: ["BATCH_MANAGE", "TEACHER_VIEW"] },
  { href: "/admin/attendance", label: "Attendance", icon: CalendarCheck, needs: ["TEACHER_ATTENDANCE", "STUDENT_ATTENDANCE_APPROVE"] },
  { href: "/admin/courses", label: "Courses", icon: BookOpen, needs: ["COURSE_MANAGE"] },
  { href: "/admin/payments", label: "Payments", icon: IndianRupee, needs: ["PAYMENT_VIEW", "PAYMENT_COLLECT", "PAYMENT_NOTIFY"] },
  { href: "/admin/enquiries", label: "Enquiries", icon: Inbox, needs: ["ENQUIRY_VIEW"] },
  { href: "/admin/results", label: "Results", icon: Award, needs: ["RESULT_MANAGE"] },
  { href: "/admin/session-summaries", label: "Session summaries", icon: BookOpenCheck, needs: ["SESSION_SUMMARY_UPLOAD"] },
  { href: "/admin/reports", label: "Reports", icon: BarChart3, needs: ["REPORT_VIEW"] },
  { href: "/admin/approvals", label: "Approvals", icon: BadgeCheck, needs: ["DOCUMENT_APPROVE"] },
  { href: "/admin/import", label: "Bulk import", icon: Upload, needs: ["STUDENT_BULK_IMPORT"] },
  { href: "/admin/control-center", label: "Control Center", icon: SlidersHorizontal, superAdminOnly: true },
  { href: "/admin/access-control", label: "Access Control", icon: ShieldCheck, superAdminOnly: true },
  { href: "/admin/recycle-bin", label: "Recycle bin", icon: Trash2, needs: ["TEACHER_MANAGE", "STUDENT_MANAGE"] },
];

export function AdminSidebar({
  user,
  role,
  capabilities = [],
  onNavigate,
}: {
  user: { name?: string | null; email?: string | null };
  role?: string;
  capabilities?: CapabilityKey[];
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const capSet = new Set(capabilities);
  const visible = NAV.filter((item) => {
    if (role === "SUPER_ADMIN") return true;
    if (item.superAdminOnly) return false;
    if (!item.needs) return true;
    return item.needs.some((k) => capSet.has(k));
  });

  return (
    <div className="flex h-full w-64 flex-col bg-slate-900 text-slate-100">
      <div className="flex items-center gap-2 px-5 py-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-blue-600 text-white">
          <GraduationCap className="size-5" />
        </span>
        <span className="text-sm font-semibold tracking-tight">Coaching LMS</span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {visible.map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        <div className="mb-3 min-w-0">
          <p className="truncate text-sm font-medium text-slate-100">{user.name}</p>
          <p className="truncate text-xs text-slate-400">{user.email}</p>
        </div>
        <LogoutButton className="w-full border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700 hover:text-white" />
      </div>
    </div>
  );
}
