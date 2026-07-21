import type { AttendanceStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

const STYLES: Record<AttendanceStatus, string> = {
  PRESENT: "bg-green-100 text-green-700",
  LATE: "bg-amber-100 text-amber-700",
  ABSENT: "bg-red-100 text-red-700",
  ON_LEAVE: "bg-slate-100 text-slate-600",
};

const LABELS: Record<AttendanceStatus, string> = {
  PRESENT: "Present",
  LATE: "Late",
  ABSENT: "Absent",
  ON_LEAVE: "On leave",
};

export function AttendanceStatusBadge({ status }: { status: AttendanceStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        STYLES[status]
      )}
    >
      {LABELS[status]}
    </span>
  );
}
