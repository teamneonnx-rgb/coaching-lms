import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";

const STYLES: Record<Role, string> = {
  ADMIN: "bg-blue-100 text-blue-700",
  TEACHER: "bg-teal-100 text-teal-700",
  STUDENT: "bg-slate-100 text-slate-700",
};

const LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  TEACHER: "Teacher",
  STUDENT: "Student",
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STYLES[role]
      )}
    >
      {LABELS[role]}
    </span>
  );
}
