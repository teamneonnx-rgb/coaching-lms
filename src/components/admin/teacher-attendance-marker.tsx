"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { markTeacherAttendance } from "@/lib/actions/admin/attendance";
import { Button } from "@/components/ui/button";

export type TeacherRow = {
  id: string;
  name: string;
  email: string;
  today: { status: string; approvalStatus: string } | null;
};

const OPTIONS = [
  { value: "PRESENT", label: "Present", cls: "bg-green-600 hover:bg-green-600/90" },
  { value: "ABSENT", label: "Absent", cls: "bg-red-600 hover:bg-red-600/90" },
  { value: "ON_LEAVE", label: "Leave", cls: "bg-slate-600 hover:bg-slate-600/90" },
] as const;

// FR-AD-01/04: Admin records daily teacher attendance (teachers cannot).
export function TeacherAttendanceMarker({ teachers, date }: { teachers: TeacherRow[]; date: string }) {
  const router = useRouter();
  const [isPending, start] = useTransition();

  function mark(teacherId: string, status: string) {
    start(async () => {
      const r = await markTeacherAttendance({ teacherId, date, status });
      if (r.ok) toast.success(r.info ?? "Marked");
      else toast.error(r.error ?? "Failed");
      router.refresh();
    });
  }

  if (teachers.length === 0) {
    return <p className="text-sm text-muted-foreground">No teachers yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {teachers.map((t) => (
        <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900">{t.name}</p>
            <p className="text-xs text-muted-foreground">
              {t.today
                ? `${t.today.status.replace("_", " ")} · ${t.today.approvalStatus === "PENDING" ? "pending approval" : "approved"}`
                : "Not marked today"}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {OPTIONS.map((o) => (
              <Button
                key={o.value}
                size="sm"
                onClick={() => mark(t.id, o.value)}
                disabled={isPending}
                className={`text-white ${o.cls} ${t.today?.status === o.value ? "ring-2 ring-offset-1 ring-slate-400" : ""}`}
              >
                {o.label}
              </Button>
            ))}
          </div>
        </li>
      ))}
    </ul>
  );
}
