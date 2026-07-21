"use client";

import { useState, useTransition } from "react";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import type { AttendanceStatus } from "@prisma/client";
import { saveBatchAttendance } from "@/lib/actions/attendance";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type RosterStudent = {
  studentId: string;
  name: string;
  email: string;
  status: AttendanceStatus | null;
};

const STATUSES: { value: AttendanceStatus; label: string }[] = [
  { value: "PRESENT", label: "Present" },
  { value: "LATE", label: "Late" },
  { value: "ABSENT", label: "Absent" },
  { value: "ON_LEAVE", label: "On leave" },
];

export function RosterForm({
  batchId,
  date,
  students,
}: {
  batchId: string;
  date: string;
  students: RosterStudent[];
}) {
  const [isPending, startTransition] = useTransition();
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(
    Object.fromEntries(students.map((s) => [s.studentId, s.status ?? "PRESENT"]))
  );

  function setStatus(studentId: string, status: AttendanceStatus) {
    setStatuses((prev) => ({ ...prev, [studentId]: status }));
  }

  function markAllPresent() {
    setStatuses(Object.fromEntries(students.map((s) => [s.studentId, "PRESENT" as const])));
  }

  function save() {
    const entries = students.map((s) => ({
      studentId: s.studentId,
      status: statuses[s.studentId] ?? "PRESENT",
    }));
    startTransition(async () => {
      const result = await saveBatchAttendance({ batchId, date, entries });
      if (result.ok) toast.success(result.info ?? "Attendance saved");
      else toast.error(result.error ?? "Could not save attendance");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" size="sm" onClick={markAllPresent} disabled={isPending}>
          Mark all present
        </Button>
        <Button
          type="button"
          onClick={save}
          disabled={isPending}
          className="bg-teal-600 text-white hover:bg-teal-600/90"
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save attendance
        </Button>
      </div>

      <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
        {students.map((s) => (
          <li key={s.studentId} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-900">{s.name}</p>
              <p className="truncate text-xs text-muted-foreground">{s.email}</p>
            </div>
            <Select
              value={statuses[s.studentId]}
              onValueChange={(v) => setStatus(s.studentId, v as AttendanceStatus)}
              disabled={isPending}
            >
              <SelectTrigger className="w-32 shrink-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </li>
        ))}
      </ul>
    </div>
  );
}
